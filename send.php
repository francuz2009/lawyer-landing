<?php

header('Content-Type: application/json; charset=utf-8');

// ===== НАСТРОЙКИ =====
$EMAIL_TO = 'evgeny@v-legal.ru';        
$EMAIL_FROM = 'site@v-legal.ru';        // Email отправителя (должен существовать на хостинге)
$TELEGRAM_BOT_TOKEN = 'ВАШ_ТОКЕН_БОТА'; 
$TELEGRAM_CHAT_ID = 'ВАШ_CHAT_ID';      
$MAX_FILE_SIZE = 10 * 1024 * 1024;     
$ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Метод не разрешен']);
    exit;
}

// ===== ЗАЩИТА ОТ СПАМА (honeypot) =====
if (!empty($_POST['botcheck'])) {
    echo json_encode(['success' => true, 'message' => 'OK']);
    exit;
}

// ===== ПОЛУЧЕНИЕ ДАННЫХ =====
$formName = htmlspecialchars(trim($_POST['form_name'] ?? 'Форма'), ENT_QUOTES, 'UTF-8');
$name = htmlspecialchars(trim($_POST['name'] ?? ''), ENT_QUOTES, 'UTF-8');
$phone = htmlspecialchars(trim($_POST['phone'] ?? ''), ENT_QUOTES, 'UTF-8');
$privacy = isset($_POST['privacy']) ? 'Да' : 'Нет';

// ===== ВАЛИДАЦИЯ =====
$errors = [];
if (empty($name) || mb_strlen($name) < 2) {
    $errors[] = 'Укажите имя (минимум 2 символа)';
}
if (empty($phone) || !preg_match('/^[\+\d\s\-\(\)]{10,20}$/', $phone)) {
    $errors[] = 'Укажите корректный номер телефона';
}
if ($privacy !== 'Да') {
    $errors[] = 'Необходимо согласие на обработку персональных данных';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => implode('; ', $errors)]);
    exit;
}

// ===== ОБРАБОТКА ФАЙЛОВ =====
$attachments = [];
if (!empty($_FILES['attachment']['name'][0])) {
    foreach ($_FILES['attachment']['tmp_name'] as $key => $tmpName) {
        if ($_FILES['attachment']['error'][$key] !== UPLOAD_ERR_OK) continue;
        
        $fileName = $_FILES['attachment']['name'][$key];
        $fileSize = $_FILES['attachment']['size'][$key];
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        if ($fileSize > $MAX_FILE_SIZE) continue;
        if (!in_array($ext, $ALLOWED_EXTENSIONS)) continue;
        
        $attachments[] = [
            'name' => $fileName,
            'tmp' => $tmpName,
            'type' => $_FILES['attachment']['type'][$key] ?: 'application/octet-stream'
        ];
    }
}

// ===== ФОРМИРОВАНИЕ СООБЩЕНИЯ =====
$timestamp = date('d.m.Y H:i');
$ip = $_SERVER['REMOTE_ADDR'] ?? 'неизвестно';

$textMessage = "🔔 *Новая заявка с сайта*\n\n";
$textMessage .= "📋 *Источник:* $formName\n";
$textMessage .= "👤 *Имя:* $name\n";
$textMessage .= "📞 *Телефон:* $phone\n";
$textMessage .= "📅 *Время:* $timestamp\n";
$textMessage .= "🌐 *IP:* $ip\n";
$textMessage .= "🔒 *Согласие на ПД:* $privacy\n";
if (!empty($attachments)) {
    $textMessage .= "📎 *Файлов:* " . count($attachments) . "\n";
}

$htmlMessage = "
<html><body style='font-family:Arial,sans-serif;'>
<h2 style='color:#162a2a;'>Новая заявка с сайта</h2>
<table style='border-collapse:collapse;'>
<tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Источник</td><td style='padding:8px;border:1px solid #ddd;'>$formName</td></tr>
<tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Имя</td><td style='padding:8px;border:1px solid #ddd;'>$name</td></tr>
<tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Телефон</td><td style='padding:8px;border:1px solid #ddd;'>$phone</td></tr>
<tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Время</td><td style='padding:8px;border:1px solid #ddd;'>$timestamp</td></tr>
<tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>IP</td><td style='padding:8px;border:1px solid #ddd;'>$ip</td></tr>
<tr><td style='padding:8px;border:1px solid #ddd;font-weight:bold;'>Согласие ПД</td><td style='padding:8px;border:1px solid #ddd;'>$privacy</td></tr>
</table>
</body></html>
";

// ===== ОТПРАВКА НА EMAIL =====
$emailSent = false;
if (!empty($attachments)) {
    $boundary = md5(uniqid(time()));
    $headers = "From: $EMAIL_FROM\r\n";
    $headers .= "Reply-To: $EMAIL_TO\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
    
    $body = "--$boundary\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $htmlMessage . "\r\n";
    
    foreach ($attachments as $file) {
        $fileContent = chunk_split(base64_encode(file_get_contents($file['tmp'])));
        $body .= "--$boundary\r\n";
        $body .= "Content-Type: {$file['type']}; name=\"{$file['name']}\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= "Content-Disposition: attachment\r\n\r\n";
        $body .= $fileContent . "\r\n";
    }
    $body .= "--$boundary--";
    
    $subject = '=?UTF-8?B?' . base64_encode("Новая заявка: $name — $formName") . '?=';
    $emailSent = mail($EMAIL_TO, $subject, $body, $headers);
} else {
    $headers = "From: $EMAIL_FROM\r\n";
    $headers .= "Reply-To: $EMAIL_TO\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    
    $subject = '=?UTF-8?B?' . base64_encode("Новая заявка: $name — $formName") . '?=';
    $emailSent = mail($EMAIL_TO, $subject, $htmlMessage, $headers);
}

// ===== ОТПРАВКА В TELEGRAM =====
$telegramSent = false;
if (!empty($TELEGRAM_BOT_TOKEN) && $TELEGRAM_BOT_TOKEN !== 'ВАШ_ТОКЕН_БОТА' && !empty($TELEGRAM_CHAT_ID)) {
    // 1. Отправляем текстовое сообщение
    $tgApi = "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage";
    $tgResponse = @file_get_contents($tgApi . '?' . http_build_query([
        'chat_id' => $TELEGRAM_CHAT_ID,
        'text' => $textMessage,
        'parse_mode' => 'Markdown'
    ]));
    $telegramSent = ($tgResponse !== false);
    
    // 2. Отправляем файлы отдельными сообщениями
    if (!empty($attachments) && function_exists('curl_init')) {
        $docApi = "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendDocument";
        foreach ($attachments as $file) {
            $postFields = [
                'chat_id' => $TELEGRAM_CHAT_ID,
                'document' => new CURLFile($file['tmp'], $file['type'], $file['name'])
            ];
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $docApi);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_exec($ch);
            curl_close($ch);
        }
    }
}

if ($emailSent || $telegramSent) {
    echo json_encode([
        'success' => true,
        'message' => 'Заявка успешно отправлена'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Не удалось отправить заявку. Попробуйте позже или свяжитесь по телефону.'
    ]);
}