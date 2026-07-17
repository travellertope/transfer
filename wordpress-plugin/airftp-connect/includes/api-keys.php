<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('airftp/v1', '/api-keys', [
        [
            'methods' => 'GET',
            'callback' => 'airftp_handle_list_api_keys',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'POST',
            'callback' => 'airftp_handle_create_api_key',
            'permission_callback' => '__return_true',
        ],
    ]);

    register_rest_route('airftp/v1', '/api-keys/(?P<id>[a-zA-Z0-9\-]+)', [
        'methods' => 'DELETE',
        'callback' => 'airftp_handle_delete_api_key',
        'permission_callback' => '__return_true',
    ]);
});

function airftp_get_user_api_keys($user_id) {
    $keys = get_user_meta($user_id, AIRFTP_API_KEYS_META_KEY, true);
    return is_array($keys) ? $keys : [];
}

function airftp_api_key_payload($key) {
    return [
        'id' => $key['id'],
        'label' => $key['label'],
        'prefix' => $key['prefix'],
        'created_at' => $key['created_at'],
    ];
}

function airftp_handle_list_api_keys(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $keys = airftp_get_user_api_keys($user->ID);

    return ['apiKeys' => array_map('airftp_api_key_payload', $keys)];
}

function airftp_handle_create_api_key(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $label = sanitize_text_field((string) $request->get_param('label'));
    if (!$label) {
        return new WP_Error('airftp_invalid_input', 'A label is required.', ['status' => 400]);
    }

    $full_key = 'airftp_' . wp_generate_password(40, false, false);
    $prefix = substr($full_key, 0, 12) . '…';

    $entry = [
        'id' => wp_generate_uuid4(),
        'label' => $label,
        'prefix' => $prefix,
        'hash' => hash('sha256', $full_key),
        'created_at' => gmdate('c'),
    ];

    $keys = airftp_get_user_api_keys($user->ID);
    $keys[] = $entry;
    update_user_meta($user->ID, AIRFTP_API_KEYS_META_KEY, $keys);

    // fullKey is only ever returned here, at creation time — only its hash is stored.
    return [
        'apiKey' => airftp_api_key_payload($entry),
        'fullKey' => $full_key,
    ];
}

function airftp_handle_delete_api_key(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $id = (string) $request->get_param('id');
    $keys = airftp_get_user_api_keys($user->ID);

    $filtered = array_values(array_filter($keys, function ($k) use ($id) {
        return $k['id'] !== $id;
    }));

    if (count($filtered) === count($keys)) {
        return new WP_Error('airftp_not_found', 'API key not found.', ['status' => 404]);
    }

    update_user_meta($user->ID, AIRFTP_API_KEYS_META_KEY, $filtered);

    return ['success' => true];
}
