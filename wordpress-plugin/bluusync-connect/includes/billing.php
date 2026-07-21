<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('bluusync/v1', '/set-pro', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_set_pro',
        'permission_callback' => '__return_true',
    ]);
});

function bluusync_authenticate_admin_request(WP_REST_Request $request) {
    $provided = (string) $request->get_header('x-bluusync-admin-secret');
    $expected = (string) get_option(BLUUSYNC_ADMIN_SECRET_OPTION);

    if (!$expected || !$provided || !hash_equals($expected, $provided)) {
        return new WP_Error('bluusync_unauthorized', 'Invalid admin secret.', ['status' => 401]);
    }

    return true;
}

function bluusync_handle_set_pro(WP_REST_Request $request) {
    $auth = bluusync_authenticate_admin_request($request);
    if (is_wp_error($auth)) {
        return $auth;
    }

    $email = sanitize_email((string) $request->get_param('email'));
    $is_pro = (bool) $request->get_param('isPro');

    if (!$email || !is_email($email)) {
        return new WP_Error('bluusync_invalid_input', 'A valid email is required.', ['status' => 400]);
    }

    $user = get_user_by('email', $email);
    if (!$user) {
        return new WP_Error('bluusync_unknown_user', 'No BluuSync account exists for that email.', ['status' => 404]);
    }

    update_user_meta($user->ID, BLUUSYNC_PRO_META_KEY, $is_pro ? '1' : '0');

    return ['user' => bluusync_user_payload($user)];
}
