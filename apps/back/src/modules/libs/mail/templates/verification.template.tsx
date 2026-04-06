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

interface VerificationTemplateProps {
  domain: string;
  token: string;
  language?: string;
}

const translations = {
  en: {
    preview: 'Verify your email',
    heading: 'Verify your email for Artyq',
    text: 'Thank you for signing up. Please click the button below to verify your email.',
    button: 'Verify your email',
    ignore: 'If you did not request this verification, please ignore this email.',
  },
  ru: {
    preview: 'Подтвердите вашу электронную почту',
    heading: 'Подтвердите вашу почту для Artyq',
    text: 'Спасибо за регистрацию. Пожалуйста, нажмите на кнопку ниже, чтобы подтвердить вашу электронную почту.',
    button: 'Подтвердить почту',
    ignore: 'Если вы не запрашивали это подтверждение, пожалуйста, проигнорируйте это письмо.',
  },
  kz: {
    preview: 'Электрондық поштаңызды растаңыз',
    heading: 'Artyq үшін поштаңызды растаңыз',
    text: 'Тіркелгеніңіз үшін рақмет. Электрондық поштаңызды растау үшін төмендегі түймені басыңыз.',
    button: 'Поштаны растау',
    ignore: 'Егер сіз бұл растауды сұрамаған болсаңыз, осы хатты елемеңіз.',
  },
};

export const VerificationTemplate = ({
  domain,
  token,
  language = 'ru',
}: VerificationTemplateProps) => {
  const verificationUrl = `${domain}/auth/verify?token=${token}`;
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
              href={verificationUrl}
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
