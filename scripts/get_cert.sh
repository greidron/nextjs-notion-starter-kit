#!/usr/bin/env sh

if [ -z "${CERTBOT_DOMAIN}" ]; then
    >&2 echo "CERTBOT_DOMAIN is not set"
    exit 1
fi
if [ -z "${CERTBOT_EMAIL}" ]; then
    >&2 echo "CERTBOT_EMAIL is not set"
    exit 1
fi
if [ -z "${CERTBOT_WEBROOT}" ]; then
    >&2 echo "CERTBOT_WEBROOT is not set"
    exit 1
fi
if [ -z "${GET_CERT_PATH}" ]; then
    >&2 echo "GET_CERT_PATH is not set"
    exit 1
fi

copy_if_updated() {
    local src="${1}"
    local dest="${2}"
    if diff -q "${src}" "${dest}" &>/dev/null; then
        >&2 echo "skip copying file from ${src} to ${dest}"
    else
        >&2 echo "copy file from ${src} to ${dest}"
        cp "${src}" "${dest}"
    fi
}

get_certificates() {
    certbot certificates | grep "Path:" | awk -F':' '{ print $2 }'
}

CERT_FILES="$(get_certificates)"
if [ -z "${CERT_FILES}" ]; then
    >&2 echo "register SSL cerificate ..."
    >&2 echo "    domain  : ${CERTBOT_DOMAIN}"
    >&2 echo "    email   : ${CERTBOT_EMAIL}"
    >&2 echo "    web root: ${CERTBOT_WEBROOT}"

    certbot certonly \
        -d "${CERTBOT_DOMAIN}" \
        -m "${CERTBOT_EMAIL}" \
        --webroot -w ${CERTBOT_WEBROOT} \
        --non-interactive --agree-tos
    if [ $? -ne 0 ]; then
        >&2 echo "ERROR: certbot registration failed"
        exit 1
    fi
else
    >&2 echo "renew SSL cerificate ..."
    certbot renew
fi

CERT_FILES="$(get_certificates)"
if [ -z "${CERT_FILES}" ]; then
    >&2 echo "ERROR: cannot find certificate files"
    exit 2
fi

>&2 echo "copy SSL cerificate to ${GET_CERT_PATH} ..."
mkdir -p "${GET_CERT_PATH}"
for CERT_FILE in ${CERT_FILES}; do
    DEST_FILE="${GET_CERT_PATH}/$(basename "${CERT_FILE}")"
    copy_if_updated "${CERT_FILE}" "${DEST_FILE}"
done
>&2 echo "done."

