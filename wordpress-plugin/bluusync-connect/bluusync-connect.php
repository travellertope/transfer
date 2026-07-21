<?php
/**
 * Plugin Name: BluuSync Connect
 * Description: REST backend (auth, saved servers, transfer history, API keys, webhooks, Pro-member flag) for the BluuSync app.
 * Version: 1.5.0
 * Author: BluuSync
 */

if (!defined('ABSPATH')) {
    exit;
}

define('BLUUSYNC_JWT_OPTION', 'bluusync_jwt_secret');
define('BLUUSYNC_ENC_OPTION', 'bluusync_enc_secret');
define('BLUUSYNC_ADMIN_SECRET_OPTION', 'bluusync_admin_secret');
define('BLUUSYNC_PRO_META_KEY', 'bluusync_pro');
define('BLUUSYNC_BILLING_PROVIDER_META_KEY', 'bluusync_billing_provider');
define('BLUUSYNC_PAYSTACK_CUSTOMER_CODE_META_KEY', 'bluusync_paystack_customer_code');
define('BLUUSYNC_PAYSTACK_SUBSCRIPTION_CODE_META_KEY', 'bluusync_paystack_subscription_code');
define('BLUUSYNC_PAYSTACK_EMAIL_TOKEN_META_KEY', 'bluusync_paystack_email_token');
define('BLUUSYNC_CONNECTIONS_META_KEY', 'bluusync_connections');
define('BLUUSYNC_HISTORY_META_KEY', 'bluusync_history');
define('BLUUSYNC_API_KEYS_META_KEY', 'bluusync_api_keys');
define('BLUUSYNC_WEBHOOKS_META_KEY', 'bluusync_webhooks');
define('BLUUSYNC_JWT_TTL', 30 * DAY_IN_SECONDS);

register_activation_hook(__FILE__, 'bluusync_connect_activate');
function bluusync_connect_activate() {
    if (!get_option(BLUUSYNC_JWT_OPTION)) {
        update_option(BLUUSYNC_JWT_OPTION, wp_generate_password(64, true, true));
    }
    if (!get_option(BLUUSYNC_ENC_OPTION)) {
        update_option(BLUUSYNC_ENC_OPTION, wp_generate_password(64, true, true));
    }
    if (!get_option(BLUUSYNC_ADMIN_SECRET_OPTION)) {
        update_option(BLUUSYNC_ADMIN_SECRET_OPTION, wp_generate_password(64, true, true));
    }
}

require_once plugin_dir_path(__FILE__) . 'includes/jwt.php';
require_once plugin_dir_path(__FILE__) . 'includes/crypto.php';
require_once plugin_dir_path(__FILE__) . 'includes/rest-routes.php';
require_once plugin_dir_path(__FILE__) . 'includes/connections.php';
require_once plugin_dir_path(__FILE__) . 'includes/account.php';
require_once plugin_dir_path(__FILE__) . 'includes/history.php';
require_once plugin_dir_path(__FILE__) . 'includes/api-keys.php';
require_once plugin_dir_path(__FILE__) . 'includes/webhooks.php';
require_once plugin_dir_path(__FILE__) . 'includes/notifications.php';
require_once plugin_dir_path(__FILE__) . 'includes/user-profile.php';
require_once plugin_dir_path(__FILE__) . 'includes/admin-settings.php';
require_once plugin_dir_path(__FILE__) . 'includes/billing.php';

/**
 * Every bluusync/v1 route authenticates itself manually (see
 * bluusync_authenticate_request / bluusync_verify_jwt) via its own Bearer token
 * format, and registers with permission_callback => '__return_true' for that
 * reason. But WordPress core runs the 'rest_authentication_errors' filter
 * before any route callback fires, and other active plugins (e.g. generic
 * JWT-auth plugins) hook it to inspect any "Authorization: Bearer ..."
 * header on every REST request, including ours — trying to decode our token
 * with their own secret/library and failing with something like "Signature
 * verification failed", which short-circuits the request before our code
 * ever runs. Since our namespace does its own auth, discard any such error
 * for our own routes so a foreign plugin's unrelated JWT handling can't
 * block them.
 */
add_filter('rest_authentication_errors', function ($result) {
    if (is_wp_error($result) && strpos($_SERVER['REQUEST_URI'] ?? '', '/bluusync/v1/') !== false) {
        return null;
    }
    return $result;
}, PHP_INT_MAX);
