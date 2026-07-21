<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('bluusync/v1', '/register', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_register',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('bluusync/v1', '/login', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_login',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('bluusync/v1', '/validate', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_validate',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('bluusync/v1', '/forgot-password', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_forgot_password',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('bluusync/v1', '/reset-password', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_reset_password',
        'permission_callback' => '__return_true',
    ]);
});

function bluusync_user_payload($user) {
    return [
        'id' => $user->ID,
        'email' => $user->user_email,
        'name' => $user->display_name,
        'isPro' => get_user_meta($user->ID, BLUUSYNC_PRO_META_KEY, true) === '1',
    ];
}

function bluusync_handle_register(WP_REST_Request $request) {
    $email = sanitize_email($request->get_param('email'));
    $password = (string) $request->get_param('password');
    $username = sanitize_user($request->get_param('username') ?: $email);

    if (!$email || !is_email($email) || strlen($password) < 8) {
        return new WP_Error('bluusync_invalid_input', 'A valid email and a password of at least 8 characters are required.', ['status' => 400]);
    }

    if (email_exists($email)) {
        return new WP_Error('bluusync_email_exists', 'An account with that email already exists.', ['status' => 409]);
    }

    if (username_exists($username)) {
        $username = $username . '_' . wp_generate_password(4, false);
    }

    $user_id = wp_create_user($username, $password, $email);

    if (is_wp_error($user_id)) {
        return $user_id;
    }

    $user = get_user_by('id', $user_id);
    wp_update_user(['ID' => $user_id, 'role' => 'subscriber']);

    return [
        'token' => bluusync_issue_jwt($user_id),
        'user' => bluusync_user_payload($user),
    ];
}

function bluusync_handle_login(WP_REST_Request $request) {
    $email = sanitize_email($request->get_param('email'));
    $password = (string) $request->get_param('password');

    if (!$email || !$password) {
        return new WP_Error('bluusync_invalid_input', 'Email and password are required.', ['status' => 400]);
    }

    $user = wp_authenticate($email, $password);

    if (is_wp_error($user)) {
        return new WP_Error('bluusync_invalid_credentials', 'Incorrect email or password.', ['status' => 401]);
    }

    return [
        'token' => bluusync_issue_jwt($user->ID),
        'user' => bluusync_user_payload($user),
    ];
}

function bluusync_handle_validate(WP_REST_Request $request) {
    $token = (string) $request->get_param('token');

    if (!$token) {
        $token = bluusync_extract_token($request);
    }

    if (!$token) {
        return new WP_Error('bluusync_missing_token', 'No token provided.', ['status' => 400]);
    }

    $user = bluusync_verify_jwt($token);

    if (is_wp_error($user)) {
        return $user;
    }

    return ['user' => bluusync_user_payload($user)];
}

function bluusync_handle_forgot_password(WP_REST_Request $request) {
    $email = sanitize_email((string) $request->get_param('email'));
    $redirect_url = esc_url_raw((string) $request->get_param('redirectUrl'));

    // Always respond success, even for unknown emails, so this endpoint
    // can't be used to enumerate accounts.
    if (!$email || !is_email($email)) {
        return ['success' => true];
    }

    $user = get_user_by('email', $email);
    if (!$user) {
        return ['success' => true];
    }

    $key = get_password_reset_key($user);
    if (is_wp_error($key)) {
        return ['success' => true];
    }

    $reset_link = add_query_arg(
        [
            'key' => $key,
            'login' => rawurlencode($user->user_login),
        ],
        $redirect_url ?: home_url('/')
    );

    $site_name = get_bloginfo('name');
    $subject = sprintf('[%s] Password Reset Request', $site_name);
    $message = "Someone has requested a password reset for your account on {$site_name}.\n\n"
        . "If this was you, click the link below to choose a new password:\n{$reset_link}\n\n"
        . "This link will expire soon. If you didn't request this, you can safely ignore this email.";

    wp_mail($user->user_email, $subject, $message);

    return ['success' => true];
}

function bluusync_handle_reset_password(WP_REST_Request $request) {
    $login = (string) $request->get_param('login');
    $key = (string) $request->get_param('key');
    $password = (string) $request->get_param('password');

    if (!$login || !$key || strlen($password) < 8) {
        return new WP_Error(
            'bluusync_invalid_input',
            'A login, reset key, and a password of at least 8 characters are required.',
            ['status' => 400]
        );
    }

    $user = check_password_reset_key($key, $login);
    if (is_wp_error($user)) {
        return new WP_Error(
            'bluusync_invalid_reset_key',
            'This password reset link is invalid or has expired.',
            ['status' => 400]
        );
    }

    if (!function_exists('reset_password')) {
        require_once ABSPATH . 'wp-admin/includes/user.php';
    }
    reset_password($user, $password);

    return [
        'token' => bluusync_issue_jwt($user->ID),
        'user' => bluusync_user_payload($user),
    ];
}
