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
}

export const VerificationTemplate = ({
  domain,
  token,
}: VerificationTemplateProps) => {
  const verificationUrl = `${domain}/verify?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>Verify your email</Preview>
      <Tailwind>
        <Body className="max-w-2xl mx-auto p-6 bg-slate-50">
          <Section className="text-center mb-8">
            <Heading className="text-3xl text-black font-bold">
              Verify your email
            </Heading>
            <Text className="text-base text-gray-600">
              Thank you for signing up. Please click the button below to verify
              your email.
            </Text>
            <Link
              className="inline-flex justify-center items-center text-sm text-white rounded-full text-sm bg-blue-500 px-5 py-2"
              href={verificationUrl}
            >
              Verify your email
            </Link>
          </Section>
          <Section className="text-center mt-8">
            <Text className="text-base text-black">
              If you did not request this verification, please ignore this
              email.
            </Text>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};
