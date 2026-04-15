import * as React from 'react';
import {
  Body,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface PasswordResetTemplateProps {
  domain: string;
  token: string;
  language?: string;
}

const translations = {
  en: {
    preview: 'Reset your password',
    heading: 'Reset your password for Artyq',
    text: 'You requested a password reset. Please click the button below to set a new password.',
    button: 'Reset password',
    ignore: 'If you did not request a password reset, please ignore this email. Your password will remain unchanged.',
  },
  ru: {
    preview: 'Сброс пароля',
    heading: 'Сброс пароля для Artyq',
    text: 'Вы запросили сброс пароля. Пожалуйста, нажмите на кнопку ниже, чтобы установить новый пароль.',
    button: 'Сбросить пароль',
    ignore: 'Если вы не запрашивали сброс пароля, пожалуйста, проигнорируйте это письмо. Ваш пароль останется без изменений.',
  },
  kz: {
    preview: 'Құпия сөзді қалпына келтіру',
    heading: 'Artyq үшін құпия сөзді қалпына келтіру',
    text: 'Сіз құпия сөзді қалпына келтіруді сұрадыңыз. Жаңа құпия сөзді орнату үшін төмендегі түймені басыңыз.',
    button: 'Құпия сөзді қалпына келтіру',
    ignore: 'Егер сіз құпия сөзді қалпына келтіруді сұрамаған болсаңыз, осы хатты елемеңіз. Құпия сөзіңіз өзгеріссіз қалады.',
  },
};

export const PasswordResetTemplate = ({
  domain,
  token,
  language = 'ru',
}: PasswordResetTemplateProps) => {
  const resetUrl = `${domain}/auth/reset-password?token=${token}`;
  const t = translations[language as keyof typeof translations] || translations.ru;

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Tailwind>
        <Body className="max-w-2xl mx-auto p-6 bg-slate-50">
          <Section className="text-center mb-8">
            <Heading className="text-3xl text-black font-bold">
              {t.heading}
            </Heading>
            <Text className="text-base text-gray-600">
              {t.text}
            </Text>
            <Link
              className="inline-flex justify-center items-center text-white rounded-full text-sm bg-blue-500 px-5 py-2"
              href={resetUrl}
            >
              {t.button}
            </Link>
          </Section>
          <Section className="text-center mt-8">
            <Text className="text-base text-black">
              {t.ignore}
            </Text>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};
