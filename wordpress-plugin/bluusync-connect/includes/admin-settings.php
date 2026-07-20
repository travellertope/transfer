<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_menu', function () {
    add_options_page(
        'BluuSync Connect',
        'BluuSync Connect',
        'manage_options',
        'bluusync-connect',
        'bluusync_render_settings_page'
    );
});

function bluusync_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    if (!get_option(BLUUSYNC_ADMIN_SECRET_OPTION)) {
        update_option(BLUUSYNC_ADMIN_SECRET_OPTION, wp_generate_password(64, true, true));
    }
    if (!get_option(BLUUSYNC_JWT_OPTION)) {
        update_option(BLUUSYNC_JWT_OPTION, wp_generate_password(64, true, true));
    }
    if (!get_option(BLUUSYNC_ENC_OPTION)) {
        update_option(BLUUSYNC_ENC_OPTION, wp_generate_password(64, true, true));
    }
    ?>
    <div class="wrap">
        <h1>BluuSync Connect</h1>
        <p>Copy this secret into the Next.js app's <code>WORDPRESS_ADMIN_SECRET</code> environment variable. It authenticates trusted server-to-server requests (e.g. the Stripe webhook) that flip a user's Pro status. Keep it private — anyone with this value can mark any account Pro.</p>
        <table class="form-table">
            <tr>
                <th scope="row">Admin Secret</th>
                <td>
                    <input type="text" readonly value="<?php echo esc_attr(get_option(BLUUSYNC_ADMIN_SECRET_OPTION)); ?>" style="width: 480px; font-family: monospace;" onclick="this.select();" />
                </td>
            </tr>
            <tr>
                <th scope="row">WordPress Base URL</th>
                <td>
                    <input type="text" readonly value="<?php echo esc_attr(home_url()); ?>" style="width: 480px; font-family: monospace;" onclick="this.select();" />
                    <p class="description">Use this for the Next.js app's <code>WORDPRESS_URL</code> variable.</p>
                </td>
            </tr>
        </table>
    </div>
    <?php
}
