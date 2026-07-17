<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('show_user_profile', 'airftp_render_pro_checkbox');
add_action('edit_user_profile', 'airftp_render_pro_checkbox');

function airftp_render_pro_checkbox($user) {
    if (!current_user_can('edit_users')) {
        return;
    }

    $is_pro = get_user_meta($user->ID, AIRFTP_PRO_META_KEY, true) === '1';
    ?>
    <h2>AirFTP</h2>
    <table class="form-table">
        <tr>
            <th><label for="airftp_pro">Pro Member</label></th>
            <td>
                <label for="airftp_pro">
                    <input type="checkbox" name="airftp_pro" id="airftp_pro" value="1" <?php checked($is_pro); ?> />
                    Grants this user the AirFTP Pro file-size limit (10GB instead of 800MB).
                </label>
            </td>
        </tr>
    </table>
    <?php
}

add_action('personal_options_update', 'airftp_save_pro_checkbox');
add_action('edit_user_profile_update', 'airftp_save_pro_checkbox');

function airftp_save_pro_checkbox($user_id) {
    if (!current_user_can('edit_users')) {
        return;
    }

    check_admin_referer('update-user_' . $user_id);

    update_user_meta(
        $user_id,
        AIRFTP_PRO_META_KEY,
        !empty($_POST['airftp_pro']) ? '1' : ''
    );
}

add_filter('manage_users_columns', 'airftp_add_pro_column');
function airftp_add_pro_column($columns) {
    $columns['airftp_pro'] = 'AirFTP Pro';
    return $columns;
}

add_filter('manage_users_custom_column', 'airftp_render_pro_column', 10, 3);
function airftp_render_pro_column($value, $column_name, $user_id) {
    if ($column_name !== 'airftp_pro') {
        return $value;
    }

    return get_user_meta($user_id, AIRFTP_PRO_META_KEY, true) === '1' ? 'Yes' : '—';
}
