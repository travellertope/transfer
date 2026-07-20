<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('bluusync/v1', '/connections', [
        [
            'methods' => 'GET',
            'callback' => 'bluusync_handle_list_connections',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'POST',
            'callback' => 'bluusync_handle_save_connection',
            'permission_callback' => '__return_true',
        ],
    ]);

    register_rest_route('bluusync/v1', '/connections/(?P<id>[a-zA-Z0-9\-]+)', [
        [
            'methods' => 'PUT',
            'callback' => 'bluusync_handle_update_connection',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'DELETE',
            'callback' => 'bluusync_handle_delete_connection',
            'permission_callback' => '__return_true',
        ],
    ]);
});

function bluusync_authenticate_request(WP_REST_Request $request) {
    $token = bluusync_extract_token($request);

    if (!$token) {
        return new WP_Error('bluusync_missing_token', 'No token provided.', ['status' => 401]);
    }

    return bluusync_verify_jwt($token);
}

function bluusync_get_user_connections($user_id) {
    $connections = get_user_meta($user_id, BLUUSYNC_CONNECTIONS_META_KEY, true);
    return is_array($connections) ? $connections : [];
}

function bluusync_connection_payload($conn) {
    return [
        'id' => $conn['id'],
        'label' => $conn['label'],
        'protocol' => bluusync_sanitize_protocol($conn['protocol'] ?? ''),
        'host' => $conn['host'],
        'port' => (!empty($conn['port'])) ? (int) $conn['port'] : null,
        'user' => $conn['user'],
        // For gdrive connections this "password" is really an OAuth refresh
        // token, but it's encrypted at rest the same way, so decryption is
        // identical either way.
        'password' => bluusync_decrypt($conn['password']),
        'path' => $conn['path'],
    ];
}

/**
 * Validates a protocol param, defaulting to 'ftp' when absent/unrecognized.
 */
function bluusync_sanitize_protocol($protocol) {
    if (in_array($protocol, ['sftp', 'gdrive', 'youtube', 'onedrive'], true)) {
        return $protocol;
    }
    return 'ftp';
}

/**
 * Validates a port param. Returns [int|null $port, WP_Error|null $error].
 */
function bluusync_sanitize_port($port_param) {
    if ($port_param === null || $port_param === '') {
        return [null, null];
    }

    $port = (int) $port_param;
    if ($port < 1 || $port > 65535) {
        return [null, new WP_Error('bluusync_invalid_input', 'Port must be between 1 and 65535.', ['status' => 400])];
    }

    return [$port, null];
}

function bluusync_handle_list_connections(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $connections = bluusync_get_user_connections($user->ID);

    return ['connections' => array_map('bluusync_connection_payload', $connections)];
}

function bluusync_handle_save_connection(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $label = sanitize_text_field((string) $request->get_param('label'));
    $protocol = bluusync_sanitize_protocol((string) $request->get_param('protocol'));
    $host = sanitize_text_field((string) $request->get_param('host'));
    [$port, $port_error] = bluusync_sanitize_port($request->get_param('port'));
    $ftp_user = sanitize_text_field((string) $request->get_param('user'));
    $password = (string) $request->get_param('password');
    $path = sanitize_text_field((string) $request->get_param('path'));

    if (!$label || !$host || !$ftp_user || !$password || !$path) {
        return new WP_Error(
            'bluusync_invalid_input',
            'label, host, user, password, and path are all required.',
            ['status' => 400]
        );
    }
    if ($port_error) {
        return $port_error;
    }

    $connections = bluusync_get_user_connections($user->ID);

    $entry = [
        'id' => wp_generate_uuid4(),
        'label' => $label,
        'protocol' => $protocol,
        'host' => $host,
        'port' => $port,
        'user' => $ftp_user,
        'password' => bluusync_encrypt($password),
        'path' => $path,
    ];

    $connections[] = $entry;
    update_user_meta($user->ID, BLUUSYNC_CONNECTIONS_META_KEY, $connections);

    return ['connection' => bluusync_connection_payload($entry)];
}

function bluusync_handle_update_connection(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $id = (string) $request->get_param('id');
    $connections = bluusync_get_user_connections($user->ID);

    $index = null;
    foreach ($connections as $i => $c) {
        if ($c['id'] === $id) {
            $index = $i;
            break;
        }
    }
    if ($index === null) {
        return new WP_Error('bluusync_not_found', 'Connection not found.', ['status' => 404]);
    }

    $existing = $connections[$index];

    $label = $request->get_param('label');
    $protocol = $request->get_param('protocol');
    $host = $request->get_param('host');
    $port_param = $request->get_param('port');
    $ftp_user = $request->get_param('user');
    $password = $request->get_param('password');
    $path = $request->get_param('path');

    if ($label !== null && $label !== '') {
        $existing['label'] = sanitize_text_field((string) $label);
    }
    if ($protocol !== null) {
        $existing['protocol'] = bluusync_sanitize_protocol((string) $protocol);
    }
    if ($host !== null && $host !== '') {
        $existing['host'] = sanitize_text_field((string) $host);
    }
    if ($port_param !== null) {
        [$port, $port_error] = bluusync_sanitize_port($port_param);
        if ($port_error) {
            return $port_error;
        }
        $existing['port'] = $port;
    }
    if ($ftp_user !== null && $ftp_user !== '') {
        $existing['user'] = sanitize_text_field((string) $ftp_user);
    }
    if ($password !== null && $password !== '') {
        $existing['password'] = bluusync_encrypt((string) $password);
    }
    if ($path !== null && $path !== '') {
        $existing['path'] = sanitize_text_field((string) $path);
    }

    $connections[$index] = $existing;
    update_user_meta($user->ID, BLUUSYNC_CONNECTIONS_META_KEY, $connections);

    return ['connection' => bluusync_connection_payload($existing)];
}

function bluusync_handle_delete_connection(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $id = (string) $request->get_param('id');
    $connections = bluusync_get_user_connections($user->ID);

    $filtered = array_values(array_filter($connections, function ($c) use ($id) {
        return $c['id'] !== $id;
    }));

    if (count($filtered) === count($connections)) {
        return new WP_Error('bluusync_not_found', 'Connection not found.', ['status' => 404]);
    }

    update_user_meta($user->ID, BLUUSYNC_CONNECTIONS_META_KEY, $filtered);

    return ['success' => true];
}
