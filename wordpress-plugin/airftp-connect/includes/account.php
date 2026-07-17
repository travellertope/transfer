<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('airftp/v1', '/user', [
        'methods' => 'PUT',
        'callback' => 'airftp_handle_update_user',
        'permission_callback' => '__return_true',
    ]);
});

function airftp_handle_update_user(WP_REST_Request $request) {
    $user = airftp_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $name = $request->get_param('name');
    $email = $request->get_param('email');
    $current_password = (string) $request->get_param('currentPassword');
    $new_password = (string) $request->get_param('newPassword');

    $update = ['ID' => $user->ID];

    if ($new_password !== '') {
        if (!wp_check_password($current_password, $user->user_pass, $user->ID)) {
            return new WP_Error('airftp_invalid_credentials', 'Current password is incorrect.', ['status' => 401]);
        }
        if (strlen($new_password) < 8) {
            return new WP_Error('airftp_invalid_input', 'New password must be at least 8 characters.', ['status' => 400]);
        }
        $update['user_pass'] = $new_password;
    }

    if ($name !== null && $name !== '') {
        $update['display_name'] = sanitize_text_field((string) $name);
    }

    if ($email !== null && $email !== '' && $email !== $user->user_email) {
        $email = sanitize_email((string) $email);
        if (!is_email($email)) {
            return new WP_Error('airftp_invalid_input', 'A valid email is required.', ['status' => 400]);
        }
        $existing_id = email_exists($email);
        if ($existing_id && (int) $existing_id !== (int) $user->ID) {
            return new WP_Error('airftp_email_exists', 'An account with that email already exists.', ['status' => 409]);
        }
        $update['user_email'] = $email;
    }

    $result = wp_update_user($update);
    if (is_wp_error($result)) {
        return $result;
    }

    $updated = get_user_by('id', $user->ID);

    return ['user' => airftp_user_payload($updated)];
}
