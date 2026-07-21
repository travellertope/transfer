<?php

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('bluusync/v1', '/notify', [
        'methods' => 'POST',
        'callback' => 'bluusync_handle_notify',
        'permission_callback' => '__return_true',
    ]);
});

function bluusync_format_bytes($bytes) {
    if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576) return round($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024) return round($bytes / 1024, 2) . ' KB';
    return $bytes . ' bytes';
}

/**
 * Emails the transfer owner when a transfer finishes (success or failure).
 * A Pro perk — silently no-ops for non-Pro accounts rather than erroring,
 * since the app already gates the call but this is a server-side backstop.
 */
function bluusync_handle_notify(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    if (get_user_meta($user->ID, BLUUSYNC_PRO_META_KEY, true) !== '1') {
        return ['success' => true, 'sent' => false];
    }

    $event = (string) $request->get_param('event');
    if (!in_array($event, ['transfer.success', 'transfer.failed'], true)) {
        return new WP_Error('bluusync_invalid_input', 'event must be "transfer.success" or "transfer.failed".', ['status' => 400]);
    }

    $source_host = sanitize_text_field((string) $request->get_param('sourceHost'));
    $dest_host = sanitize_text_field((string) $request->get_param('destHost'));
    $bytes = (int) $request->get_param('bytes');
    $error = sanitize_text_field((string) $request->get_param('error'));
    $history_url = esc_url_raw((string) $request->get_param('historyUrl'));

    $success = $event === 'transfer.success';
    $site_name = get_bloginfo('name');
    $subject = sprintf('[%s] Transfer %s', $site_name, $success ? 'complete' : 'failed');

    $lines = [
        $success ? 'Your transfer finished successfully.' : 'Your transfer failed.',
        '',
        "From: {$source_host}",
        "To:   {$dest_host}",
    ];
    if ($success && $bytes > 0) {
        $lines[] = '';
        $lines[] = 'Size: ' . bluusync_format_bytes($bytes);
    }
    if (!$success && $error) {
        $lines[] = '';
        $lines[] = "Error: {$error}";
    }
    if ($history_url) {
        $lines[] = '';
        $lines[] = "View details: {$history_url}";
    }

    wp_mail($user->user_email, $subject, implode("\n", $lines));

    return ['success' => true, 'sent' => true];
}
