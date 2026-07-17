<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('airftp/v1', '/connections', [
        [
            'methods' => 'GET',
            'callback' => 'airftp_handle_list_connections',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'POST',
            'callback' => 'airftp_handle_save_connection',
            'permission_callback' => '__return_true',
        ],
    ]);

    register_rest_route('airftp/v1', '/connections/(?P<id>[a-zA-Z0-9\-]+)', [
        [
            'methods' => 'PUT',
            'callback' => 'airftp_handle_update_connection',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'DELETE',
            'callback' => 'airftp_handle_delete_connection',
            'permission_callback' => '__return_true',
        ],
    ]);
});

function airftp_authenticate_request(WP_REST_Request $request) {
    $auth_header = $request->get_header('authorization');
    $token = '';

    if ($auth_header && stripos($auth_header, 'Bearer ') === 0) {
        $token = substr($auth_header, 7);
    }

    if (!$token) {
        return new WP_Error('airftp_missing_token', 'No token provided.', ['status' => 401]);
    }

    return airftp_verify_jwt($token);
}

function airftp_get_user_connections($user_id) {
    $connections = get_user_meta($user_id, AIRFTP_CONNECTIONS_META_KEY, true);
    return is_array($connections) ? $connections : [];
}

function airftp_connection_payload($conn) {
    return [
        'id' => $conn['id'],
        'label' => $conn['label'],
        'role' => $conn['role'],
        'protocol' => (isset($conn['protocol']) && $conn['protocol'] === 'sftp') ? 'sftp' : 'ftp',
        'host' => $conn['host'],
        'port' => (!empty($conn['port'])) ? (int) $conn['port'] : null,
        'user' => $conn['user'],
        'password' => airftp_decrypt($conn['password']),
        'path' => $conn['path'],
    ];
}

/**
 * Validates a protocol param, defaulting to 'ftp' when absent/unrecognized.
 */
function airftp_sanitize_protocol($protocol) {
    return ($protocol === 'sftp') ? 'sftp' : 'ftp';
}

/**
 * Validates a port param. Returns [int|null $port, WP_Error|null $error].
 */
function airftp_sanitize_port($port_param) {
    if ($port_param === null || $port_param === '') {
        return [null, null];
    }

    $port = (int) $port_param;
    if ($port < 1 || $port > 65535) {
        return [null, new WP_Error('airftp_invalid_input', 'Port must be between 1 and 65535.', ['status' => 400])];
    }

    return [$port, null];
}

function airftp_handle_list_connections(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $connections = airftp_get_user_connections($user->ID);

    return ['connections' => array_map('airftp_connection_payload', $connections)];
}

function airftp_handle_save_connection(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $label = sanitize_text_field((string) $request->get_param('label'));
    $role = (string) $request->get_param('role');
    $protocol = airftp_sanitize_protocol((string) $request->get_param('protocol'));
    $host = sanitize_text_field((string) $request->get_param('host'));
    [$port, $port_error] = airftp_sanitize_port($request->get_param('port'));
    $ftp_user = sanitize_text_field((string) $request->get_param('user'));
    $password = (string) $request->get_param('password');
    $path = sanitize_text_field((string) $request->get_param('path'));

    if (!$label || !in_array($role, ['source', 'destination'], true) || !$host || !$ftp_user || !$password || !$path) {
        return new WP_Error(
            'airftp_invalid_input',
            'label, role, host, user, password, and path are all required.',
            ['status' => 400]
        );
    }
    if ($port_error) {
        return $port_error;
    }

    $connections = airftp_get_user_connections($user->ID);

    $entry = [
        'id' => wp_generate_uuid4(),
        'label' => $label,
        'role' => $role,
        'protocol' => $protocol,
        'host' => $host,
        'port' => $port,
        'user' => $ftp_user,
        'password' => airftp_encrypt($password),
        'path' => $path,
    ];

    $connections[] = $entry;
    update_user_meta($user->ID, AIRFTP_CONNECTIONS_META_KEY, $connections);

    return ['connection' => airftp_connection_payload($entry)];
}

function airftp_handle_update_connection(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $id = (string) $request->get_param('id');
    $connections = airftp_get_user_connections($user->ID);

    $index = null;
    foreach ($connections as $i => $c) {
        if ($c['id'] === $id) {
            $index = $i;
            break;
        }
    }
    if ($index === null) {
        return new WP_Error('airftp_not_found', 'Connection not found.', ['status' => 404]);
    }

    $existing = $connections[$index];

    $label = $request->get_param('label');
    $role = $request->get_param('role');
    $protocol = $request->get_param('protocol');
    $host = $request->get_param('host');
    $port_param = $request->get_param('port');
    $ftp_user = $request->get_param('user');
    $password = $request->get_param('password');
    $path = $request->get_param('path');

    if ($label !== null && $label !== '') {
        $existing['label'] = sanitize_text_field((string) $label);
    }
    if ($role !== null && in_array($role, ['source', 'destination'], true)) {
        $existing['role'] = $role;
    }
    if ($protocol !== null) {
        $existing['protocol'] = airftp_sanitize_protocol((string) $protocol);
    }
    if ($host !== null && $host !== '') {
        $existing['host'] = sanitize_text_field((string) $host);
    }
    if ($port_param !== null) {
        [$port, $port_error] = airftp_sanitize_port($port_param);
        if ($port_error) {
            return $port_error;
        }
        $existing['port'] = $port;
    }
    if ($ftp_user !== null && $ftp_user !== '') {
        $existing['user'] = sanitize_text_field((string) $ftp_user);
    }
    if ($password !== null && $password !== '') {
        $existing['password'] = airftp_encrypt((string) $password);
    }
    if ($path !== null && $path !== '') {
        $existing['path'] = sanitize_text_field((string) $path);
    }

    $connections[$index] = $existing;
    update_user_meta($user->ID, AIRFTP_CONNECTIONS_META_KEY, $connections);

    return ['connection' => airftp_connection_payload($existing)];
}

function airftp_handle_delete_connection(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $id = (string) $request->get_param('id');
    $connections = airftp_get_user_connections($user->ID);

    $filtered = array_values(array_filter($connections, function ($c) use ($id) {
        return $c['id'] !== $id;
    }));

    if (count($filtered) === count($connections)) {
        return new WP_Error('airftp_not_found', 'Connection not found.', ['status' => 404]);
    }

    update_user_meta($user->ID, AIRFTP_CONNECTIONS_META_KEY, $filtered);

    return ['success' => true];
}
