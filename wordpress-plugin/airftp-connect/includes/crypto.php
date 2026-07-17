<?php

if (!defined('ABSPATH')) {
    exit;
}

function airftp_encryption_key() {
    $secret = get_option(AIRFTP_ENC_OPTION);
    return hash('sha256', $secret, true);
}

function airftp_encrypt($plaintext) {
    if ($plaintext === '' || $plaintext === null) {
        return '';
    }

    $iv = openssl_random_pseudo_bytes(16);
    $ciphertext = openssl_encrypt($plaintext, 'aes-256-cbc', airftp_encryption_key(), OPENSSL_RAW_DATA, $iv);

    return base64_encode($iv) . ':' . base64_encode($ciphertext);
}

function airftp_decrypt($encoded) {
    if (!$encoded || !is_string($encoded) || strpos($encoded, ':') === false) {
        return '';
    }

    [$iv_b64, $ciphertext_b64] = explode(':', $encoded, 2);
    $iv = base64_decode($iv_b64);
    $ciphertext = base64_decode($ciphertext_b64);

    $plaintext = openssl_decrypt($ciphertext, 'aes-256-cbc', airftp_encryption_key(), OPENSSL_RAW_DATA, $iv);

    return $plaintext === false ? '' : $plaintext;
}
