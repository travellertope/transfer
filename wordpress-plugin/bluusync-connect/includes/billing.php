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

    register_rest_route('bluusync/v1', '/paystack/sync', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_paystack_sync',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('bluusync/v1', '/paystack/lookup', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_paystack_lookup',
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
    // This endpoint is only ever called from the Stripe webhook — Paystack
    // syncs through bluusync_handle_paystack_sync() instead.
    update_user_meta($user->ID, BLUUSYNC_BILLING_PROVIDER_META_KEY, 'stripe');

    return ['user' => bluusync_user_payload($user)];
}

/**
 * Single sync endpoint for the Paystack webhook. Paystack's events don't all
 * carry the same identifying info — charge.success has our own metadata
 * (email), but subscription.create and subscription.disable only carry
 * Paystack's own customer/subscription codes — so the caller passes whichever
 * lookup key it has, and whichever fields it wants updated.
 */
function bluusync_handle_paystack_sync(WP_REST_Request $request) {
    $auth = bluusync_authenticate_admin_request($request);
    if (is_wp_error($auth)) {
        return $auth;
    }

    $email = sanitize_email((string) $request->get_param('email'));
    $customer_code = sanitize_text_field((string) $request->get_param('customerCode'));
    $subscription_code = sanitize_text_field((string) $request->get_param('subscriptionCode'));

    $user = null;
    if ($email && is_email($email)) {
        $user = get_user_by('email', $email);
    } elseif ($customer_code) {
        $matches = get_users([
            'meta_key' => BLUUSYNC_PAYSTACK_CUSTOMER_CODE_META_KEY,
            'meta_value' => $customer_code,
            'number' => 1,
        ]);
        $user = $matches[0] ?? null;
    } elseif ($subscription_code) {
        $matches = get_users([
            'meta_key' => BLUUSYNC_PAYSTACK_SUBSCRIPTION_CODE_META_KEY,
            'meta_value' => $subscription_code,
            'number' => 1,
        ]);
        $user = $matches[0] ?? null;
    }

    if (!$user) {
        return new WP_Error('bluusync_unknown_user', 'No matching BluuSync account found.', ['status' => 404]);
    }

    if ($request->has_param('isPro')) {
        update_user_meta($user->ID, BLUUSYNC_PRO_META_KEY, ((bool) $request->get_param('isPro')) ? '1' : '0');
    }
    if ($request->has_param('billingProvider')) {
        update_user_meta($user->ID, BLUUSYNC_BILLING_PROVIDER_META_KEY, sanitize_text_field((string) $request->get_param('billingProvider')));
    }
    if ($customer_code) {
        update_user_meta($user->ID, BLUUSYNC_PAYSTACK_CUSTOMER_CODE_META_KEY, $customer_code);
    }
    if ($subscription_code) {
        update_user_meta($user->ID, BLUUSYNC_PAYSTACK_SUBSCRIPTION_CODE_META_KEY, $subscription_code);
    }
    if ($request->has_param('emailToken')) {
        update_user_meta($user->ID, BLUUSYNC_PAYSTACK_EMAIL_TOKEN_META_KEY, sanitize_text_field((string) $request->get_param('emailToken')));
    }

    return ['user' => bluusync_user_payload($user)];
}

/**
 * Server-to-server only — hands back the Paystack subscription/email-token
 * pair the app needs to call Paystack's /subscription/disable endpoint.
 * Never exposed to the browser; the app's cancel route calls this after
 * authenticating the requesting user itself.
 */
function bluusync_handle_paystack_lookup(WP_REST_Request $request) {
    $auth = bluusync_authenticate_admin_request($request);
    if (is_wp_error($auth)) {
        return $auth;
    }

    $email = sanitize_email((string) $request->get_param('email'));
    if (!$email || !is_email($email)) {
        return new WP_Error('bluusync_invalid_input', 'A valid email is required.', ['status' => 400]);
    }

    $user = get_user_by('email', $email);
    if (!$user) {
        return new WP_Error('bluusync_unknown_user', 'No BluuSync account exists for that email.', ['status' => 404]);
    }

    return [
        'subscriptionCode' => get_user_meta($user->ID, BLUUSYNC_PAYSTACK_SUBSCRIPTION_CODE_META_KEY, true) ?: null,
        'emailToken' => get_user_meta($user->ID, BLUUSYNC_PAYSTACK_EMAIL_TOKEN_META_KEY, true) ?: null,
    ];
}
