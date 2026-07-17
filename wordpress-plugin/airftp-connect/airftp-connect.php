<?php
/**
 * Plugin Name: AirFTP Connect
 * Description: REST backend (auth, saved servers, transfer history, API keys, webhooks, Pro-member flag) for the AirFTP app.
 * Version: 1.2.0
 * Author: AirFTP
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AIRFTP_JWT_OPTION', 'airftp_jwt_secret');
define('AIRFTP_ENC_OPTION', 'airftp_enc_secret');
define('AIRFTP_ADMIN_SECRET_OPTION', 'airftp_admin_secret');
define('AIRFTP_PRO_META_KEY', 'airftp_pro');
define('AIRFTP_CONNECTIONS_META_KEY', 'airftp_connections');
define('AIRFTP_HISTORY_META_KEY', 'airftp_history');
define('AIRFTP_API_KEYS_META_KEY', 'airftp_api_keys');
define('AIRFTP_WEBHOOKS_META_KEY', 'airftp_webhooks');
define('AIRFTP_JWT_TTL', 30 * DAY_IN_SECONDS);

register_activation_hook(__FILE__, 'airftp_connect_activate');
function airftp_connect_activate() {
    if (!get_option(AIRFTP_JWT_OPTION)) {
        update_option(AIRFTP_JWT_OPTION, wp_generate_password(64, true, true));
    }
    if (!get_option(AIRFTP_ENC_OPTION)) {
        update_option(AIRFTP_ENC_OPTION, wp_generate_password(64, true, true));
    }
    if (!get_option(AIRFTP_ADMIN_SECRET_OPTION)) {
        update_option(AIRFTP_ADMIN_SECRET_OPTION, wp_generate_password(64, true, true));
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
require_once plugin_dir_path(__FILE__) . 'includes/user-profile.php';
require_once plugin_dir_path(__FILE__) . 'includes/admin-settings.php';
require_once plugin_dir_path(__FILE__) . 'includes/billing.php';
