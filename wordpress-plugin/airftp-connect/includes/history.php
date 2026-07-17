<?php

if (!defined('ABSPATH')) {
    exit;
}

define('AIRFTP_HISTORY_LIMIT', 100);

add_action('rest_api_init', function () {
    register_rest_route('airftp/v1', '/history', [
        [
            'methods' => 'GET',
            'callback' => 'airftp_handle_list_history',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'POST',
            'callback' => 'airftp_handle_add_history',
            'permission_callback' => '__return_true',
        ],
    ]);
});

function airftp_get_user_history($user_id) {
    $history = get_user_meta($user_id, AIRFTP_HISTORY_META_KEY, true);
    return is_array($history) ? $history : [];
}

/**
 * Encrypts a source/destination server config for storage, so a failed
 * transfer can be retried later without the user re-entering credentials.
 * Returns null if the input doesn't look like a usable config (e.g. an
 * older client that didn't send one).
 */
function airftp_sanitize_transfer_config($param) {
    if (!is_array($param)) {
        return null;
    }

    $host = sanitize_text_field((string) ($param['host'] ?? ''));
    $ftp_user = sanitize_text_field((string) ($param['user'] ?? ''));
    $path = sanitize_text_field((string) ($param['path'] ?? ''));
    $password = (string) ($param['password'] ?? '');

    if (!$host || !$ftp_user || !$path) {
        return null;
    }

    return [
        'protocol' => airftp_sanitize_protocol((string) ($param['protocol'] ?? '')),
        'host' => $host,
        'port' => (!empty($param['port'])) ? (int) $param['port'] : null,
        'user' => $ftp_user,
        'password' => $password !== '' ? airftp_encrypt($password) : '',
        'path' => $path,
    ];
}

/** Decrypts a stored config back into a usable server config for the app. */
function airftp_transfer_config_payload($cfg) {
    if (!is_array($cfg)) {
        return null;
    }

    return [
        'protocol' => (isset($cfg['protocol']) && $cfg['protocol'] === 'sftp') ? 'sftp' : 'ftp',
        'host' => $cfg['host'] ?? '',
        'port' => (!empty($cfg['port'])) ? (int) $cfg['port'] : null,
        'user' => $cfg['user'] ?? '',
        'password' => !empty($cfg['password']) ? airftp_decrypt($cfg['password']) : '',
        'path' => $cfg['path'] ?? '',
    ];
}

function airftp_history_payload($record) {
    return [
        'id' => $record['id'],
        'created_at' => $record['created_at'],
        'source_host' => $record['source_host'],
        'source_path' => $record['source_path'],
        'dest_host' => $record['dest_host'],
        'dest_path' => $record['dest_path'],
        'bytes' => (int) $record['bytes'],
        'status' => $record['status'],
        'error' => $record['error'],
        // Only present for transfers recorded after retry support shipped —
        // older entries retryable=false since there's nothing to retry with.
        'source' => isset($record['source']) ? airftp_transfer_config_payload($record['source']) : null,
        'destination' => isset($record['destination']) ? airftp_transfer_config_payload($record['destination']) : null,
    ];
}

function airftp_handle_list_history(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $history = array_reverse(airftp_get_user_history($user->ID));

    return ['transfers' => array_map('airftp_history_payload', $history)];
}

function airftp_handle_add_history(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $status = (string) $request->get_param('status');
    if (!in_array($status, ['success', 'failed'], true)) {
        return new WP_Error('airftp_invalid_input', 'status must be "success" or "failed".', ['status' => 400]);
    }

    $entry = [
        'id' => wp_generate_uuid4(),
        'created_at' => gmdate('c'),
        'source_host' => sanitize_text_field((string) $request->get_param('sourceHost')),
        'source_path' => sanitize_text_field((string) $request->get_param('sourcePath')),
        'dest_host' => sanitize_text_field((string) $request->get_param('destHost')),
        'dest_path' => sanitize_text_field((string) $request->get_param('destPath')),
        'bytes' => (int) $request->get_param('bytes'),
        'status' => $status,
        'error' => sanitize_text_field((string) $request->get_param('error')),
        'source' => airftp_sanitize_transfer_config($request->get_param('source')),
        'destination' => airftp_sanitize_transfer_config($request->get_param('destination')),
    ];

    $history = airftp_get_user_history($user->ID);
    $history[] = $entry;

    if (count($history) > AIRFTP_HISTORY_LIMIT) {
        $history = array_slice($history, -AIRFTP_HISTORY_LIMIT);
    }

    update_user_meta($user->ID, AIRFTP_HISTORY_META_KEY, $history);

    return ['transfer' => airftp_history_payload($entry)];
}
