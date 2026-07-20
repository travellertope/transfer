<?php

if (!defined('ABSPATH')) {
    exit;
}

define('BLUUSYNC_ALLOWED_WEBHOOK_EVENTS', ['transfer.success', 'transfer.failed']);

add_action('rest_api_init', function () {
    register_rest_route('bluusync/v1', '/webhooks', [
        [
            'methods' => 'GET',
            'callback' => 'bluusync_handle_list_webhooks',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'POST',
            'callback' => 'bluusync_handle_create_webhook',
            'permission_callback' => '__return_true',
        ],
    ]);

    register_rest_route('bluusync/v1', '/webhooks/(?P<id>[a-zA-Z0-9\-]+)', [
        [
            'methods' => 'PUT',
            'callback' => 'bluusync_handle_update_webhook',
            'permission_callback' => '__return_true',
        ],
        [
            'methods' => 'DELETE',
            'callback' => 'bluusync_handle_delete_webhook',
            'permission_callback' => '__return_true',
        ],
    ]);
});

function bluusync_get_user_webhooks($user_id) {
    $hooks = get_user_meta($user_id, BLUUSYNC_WEBHOOKS_META_KEY, true);
    return is_array($hooks) ? $hooks : [];
}

function bluusync_webhook_payload($hook) {
    return [
        'id' => $hook['id'],
        'label' => $hook['label'],
        'url' => $hook['url'],
        'events' => array_values($hook['events']),
        'active' => (bool) $hook['active'],
        'created_at' => $hook['created_at'],
        // Shown persistently (unlike API keys) so the user can configure
        // their receiver to verify the X-BluuSync-Signature header at any time.
        'secret' => $hook['secret'] ?? '',
    ];
}

function bluusync_sanitize_webhook_events($events) {
    if (!is_array($events)) {
        return [];
    }
    return array_values(array_intersect(array_map('sanitize_text_field', $events), BLUUSYNC_ALLOWED_WEBHOOK_EVENTS));
}

function bluusync_validate_webhook_input($label, $url, $events) {
    if (!$label || !$url || !filter_var($url, FILTER_VALIDATE_URL) || empty($events)) {
        return new WP_Error(
            'bluusync_invalid_input',
            'label, a valid url, and at least one event are required.',
            ['status' => 400]
        );
    }
    return null;
}

function bluusync_handle_list_webhooks(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $hooks = bluusync_get_user_webhooks($user->ID);

    // Backfill secrets for webhooks created before signing was added.
    $changed = false;
    foreach ($hooks as $i => $h) {
        if (empty($h['secret'])) {
            $hooks[$i]['secret'] = 'whsec_' . wp_generate_password(40, false, false);
            $changed = true;
        }
    }
    if ($changed) {
        update_user_meta($user->ID, BLUUSYNC_WEBHOOKS_META_KEY, $hooks);
    }

    return ['webhooks' => array_map('bluusync_webhook_payload', $hooks)];
}

function bluusync_handle_create_webhook(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $label = sanitize_text_field((string) $request->get_param('label'));
    $url = esc_url_raw((string) $request->get_param('url'));
    $events = bluusync_sanitize_webhook_events($request->get_param('events'));
    $active = (bool) $request->get_param('active');

    $error = bluusync_validate_webhook_input($label, $url, $events);
    if ($error) {
        return $error;
    }

    $entry = [
        'id' => wp_generate_uuid4(),
        'label' => $label,
        'url' => $url,
        'events' => $events,
        'active' => $active,
        'created_at' => gmdate('c'),
        'secret' => 'whsec_' . wp_generate_password(40, false, false),
    ];

    $hooks = bluusync_get_user_webhooks($user->ID);
    $hooks[] = $entry;
    update_user_meta($user->ID, BLUUSYNC_WEBHOOKS_META_KEY, $hooks);

    return ['webhook' => bluusync_webhook_payload($entry)];
}

function bluusync_handle_update_webhook(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $id = (string) $request->get_param('id');
    $hooks = bluusync_get_user_webhooks($user->ID);

    $index = null;
    foreach ($hooks as $i => $h) {
        if ($h['id'] === $id) {
            $index = $i;
            break;
        }
    }
    if ($index === null) {
        return new WP_Error('bluusync_not_found', 'Webhook not found.', ['status' => 404]);
    }

    $label = sanitize_text_field((string) $request->get_param('label'));
    $url = esc_url_raw((string) $request->get_param('url'));
    $events = bluusync_sanitize_webhook_events($request->get_param('events'));
    $active = (bool) $request->get_param('active');

    $error = bluusync_validate_webhook_input($label, $url, $events);
    if ($error) {
        return $error;
    }

    $hooks[$index] = [
        'id' => $id,
        'label' => $label,
        'url' => $url,
        'events' => $events,
        'active' => $active,
        'created_at' => $hooks[$index]['created_at'],
        'secret' => $hooks[$index]['secret'] ?? ('whsec_' . wp_generate_password(40, false, false)),
    ];

    update_user_meta($user->ID, BLUUSYNC_WEBHOOKS_META_KEY, $hooks);

    return ['webhook' => bluusync_webhook_payload($hooks[$index])];
}

function bluusync_handle_delete_webhook(WP_REST_Request $request) {
    $user = bluusync_authenticate_request($request);
    if (is_wp_error($user)) {
        return $user;
    }

    $id = (string) $request->get_param('id');
    $hooks = bluusync_get_user_webhooks($user->ID);

    $filtered = array_values(array_filter($hooks, function ($h) use ($id) {
        return $h['id'] !== $id;
    }));

    if (count($filtered) === count($hooks)) {
        return new WP_Error('bluusync_not_found', 'Webhook not found.', ['status' => 404]);
    }

    update_user_meta($user->ID, BLUUSYNC_WEBHOOKS_META_KEY, $filtered);

    return ['success' => true];
}
