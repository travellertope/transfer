<?php

if (!defined('ABSPATH')) {
    exit;
}

function airftp_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function airftp_base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function airftp_issue_jwt($user_id) {
    $secret = get_option(AIRFTP_JWT_OPTION);

    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $payload = [
        'sub' => $user_id,
        'iat' => time(),
        'exp' => time() + AIRFTP_JWT_TTL,
    ];

    $segments = [
        airftp_base64url_encode(wp_json_encode($header)),
        airftp_base64url_encode(wp_json_encode($payload)),
    ];

    $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
    $segments[] = airftp_base64url_encode($signature);

    return implode('.', $segments);
}

/**
 * Verifies a JWT issued by airftp_issue_jwt(). Returns the WP_User on
 * success, or a WP_Error on failure (bad signature, expired, unknown user).
 */
function airftp_verify_jwt($token) {
    $secret = get_option(AIRFTP_JWT_OPTION);
    $parts = explode('.', $token);

    if (count($parts) !== 3) {
        return new WP_Error('airftp_invalid_token', 'Malformed token.', ['status' => 401]);
    }

    [$header_b64, $payload_b64, $signature_b64] = $parts;

    $expected_signature = airftp_base64url_encode(
        hash_hmac('sha256', "$header_b64.$payload_b64", $secret, true)
    );

    if (!hash_equals($expected_signature, $signature_b64)) {
        return new WP_Error('airftp_invalid_signature', 'Invalid token signature.', ['status' => 401]);
    }

    $payload = json_decode(airftp_base64url_decode($payload_b64), true);

    if (!is_array($payload) || empty($payload['sub']) || empty($payload['exp'])) {
        return new WP_Error('airftp_invalid_payload', 'Invalid token payload.', ['status' => 401]);
    }

    if (time() >= (int) $payload['exp']) {
        return new WP_Error('airftp_token_expired', 'Token has expired.', ['status' => 401]);
    }

    $user = get_user_by('id', (int) $payload['sub']);

    if (!$user) {
        return new WP_Error('airftp_unknown_user', 'User no longer exists.', ['status' => 401]);
    }

    return $user;
}
