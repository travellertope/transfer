<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('airftp/v1', '/set-pro', [
        'methods' => 'POST',
        'callback' => 'airftp_handle_set_pro',
        'permission_callback' => '__return_true',
    ]);
});

function airftp_authenticate_admin_request(WP_REST_Request $request) {
    $provided = (string) $request->get_header('x-airftp-admin-secret');
    $expected = (string) get_option(AIRFTP_ADMIN_SECRET_OPTION);

    if (!$expected || !$provided || !hash_equals($expected, $provided)) {
        return new WP_Error('airftp_unauthorized', 'Invalid admin secret.', ['status' => 401]);
    }

    return true;
}

function airftp_handle_set_pro(WP_REST_Request $request) {
    $auth = airftp_authenticate_admin_request($request);
    if (is_wp_error($auth)) {
        return $auth;
    }

    $email = sanitize_email((string) $request->get_param('email'));
    $is_pro = (bool) $request->get_param('isPro');

    if (!$email || !is_email($email)) {
        return new WP_Error('airftp_invalid_input', 'A valid email is required.', ['status' => 400]);
    }

    $user = get_user_by('email', $email);
    if (!$user) {
        return new WP_Error('airftp_unknown_user', 'No AirFTP account exists for that email.', ['status' => 404]);
    }

    update_user_meta($user->ID, AIRFTP_PRO_META_KEY, $is_pro ? '1' : '0');

    return ['user' => airftp_user_payload($user)];
}
