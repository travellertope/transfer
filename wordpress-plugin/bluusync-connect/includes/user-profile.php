<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('show_user_profile', 'bluusync_render_pro_checkbox');
add_action('edit_user_profile', 'bluusync_render_pro_checkbox');

function bluusync_render_pro_checkbox($user) {
    if (!current_user_can('edit_users')) {
        return;
    }

    $is_pro = get_user_meta($user->ID, BLUUSYNC_PRO_META_KEY, true) === '1';
    ?>
    <h2>BluuSync</h2>
    <table class="form-table">
        <tr>
            <th><label for="bluusync_pro">Pro Member</label></th>
            <td>
                <label for="bluusync_pro">
                    <input type="checkbox" name="bluusync_pro" id="bluusync_pro" value="1" <?php checked($is_pro); ?> />
                    Grants this user the BluuSync Pro file-size limit (10GB instead of 800MB).
                </label>
            </td>
        </tr>
    </table>
    <?php
}

add_action('personal_options_update', 'bluusync_save_pro_checkbox');
add_action('edit_user_profile_update', 'bluusync_save_pro_checkbox');

function bluusync_save_pro_checkbox($user_id) {
    if (!current_user_can('edit_users')) {
        return;
    }

    check_admin_referer('update-user_' . $user_id);

    update_user_meta(
        $user_id,
        BLUUSYNC_PRO_META_KEY,
        !empty($_POST['bluusync_pro']) ? '1' : ''
    );
}

add_filter('manage_users_columns', 'bluusync_add_pro_column');
function bluusync_add_pro_column($columns) {
    $columns['bluusync_pro'] = 'BluuSync Pro';
    return $columns;
}

add_filter('manage_users_custom_column', 'bluusync_render_pro_column', 10, 3);
function bluusync_render_pro_column($value, $column_name, $user_id) {
    if ($column_name !== 'bluusync_pro') {
        return $value;
    }

    return get_user_meta($user_id, BLUUSYNC_PRO_META_KEY, true) === '1' ? 'Yes' : '—';
}
