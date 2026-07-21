<?php

if (!defined('ABSPATH')) {
    exit;
}

function bluusync_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function bluusync_base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function bluusync_issue_jwt($user_id) {
    $secret = get_option(BLUUSYNC_JWT_OPTION);

    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $payload = [
        'sub' => $user_id,
        'iat' => time(),
        'exp' => time() + BLUUSYNC_JWT_TTL,
    ];

    $segments = [
        bluusync_base64url_encode(wp_json_encode($header)),
        bluusync_base64url_encode(wp_json_encode($payload)),
    ];

    $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
    $segments[] = bluusync_base64url_encode($signature);

    return implode('.', $segments);
}

/**
 * Pulls the session token off a request. Prefers the custom X-BluuSync-Token
 * header over a standard "Authorization: Bearer ..." header — some hosts run
 * a security/JWT plugin that inspects any Authorization: Bearer header on
 * every REST request and rejects ours before it reaches this plugin's own
 * verification, with an unrelated "Signature verification failed" error.
 * The custom header isn't recognized by that kind of generic interception,
 * so it reaches us untouched. Bearer is kept as a fallback for callers that
 * haven't switched over yet.
 */
function bluusync_extract_token(WP_REST_Request $request) {
    $custom = (string) $request->get_header('x-bluusync-token');
    if ($custom) {
        return $custom;
    }

    $auth_header = $request->get_header('authorization');
    if ($auth_header && stripos($auth_header, 'Bearer ') === 0) {
        return substr($auth_header, 7);
    }

    return '';
}

/**
 * Verifies a JWT issued by bluusync_issue_jwt(). Returns the WP_User on
 * success, or a WP_Error on failure (bad signature, expired, unknown user).
 */
function bluusync_verify_jwt($token) {
    $secret = get_option(BLUUSYNC_JWT_OPTION);
    $parts = explode('.', $token);

    if (count($parts) !== 3) {
        return new WP_Error('bluusync_invalid_token', 'Malformed token.', ['status' => 401]);
    }

    [$header_b64, $payload_b64, $signature_b64] = $parts;

    $expected_signature = bluusync_base64url_encode(
        hash_hmac('sha256', "$header_b64.$payload_b64", $secret, true)
    );

    if (!hash_equals($expected_signature, $signature_b64)) {
        return new WP_Error('bluusync_invalid_signature', 'Invalid token signature.', ['status' => 401]);
    }

    $payload = json_decode(bluusync_base64url_decode($payload_b64), true);

    if (!is_array($payload) || empty($payload['sub']) || empty($payload['exp'])) {
        return new WP_Error('bluusync_invalid_payload', 'Invalid token payload.', ['status' => 401]);
    }

    if (time() >= (int) $payload['exp']) {
        return new WP_Error('bluusync_token_expired', 'Token has expired.', ['status' => 401]);
    }

    $user = get_user_by('id', (int) $payload['sub']);

    if (!$user) {
        return new WP_Error('bluusync_unknown_user', 'User no longer exists.', ['status' => 401]);
    }

    return $user;
}
