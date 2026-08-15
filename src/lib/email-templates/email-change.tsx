import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  brand,
  button,
  container,
  content,
  footer,
  h1,
  header,
  main,
  text,
} from "./estilos";

interface EmailChangeEmailProps {
  siteName: string;
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu novo e-mail no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Confirme seu novo e-mail</Heading>
          <Text style={text}>
            Você pediu para alterar o e-mail da sua conta no {siteName}
            {oldEmail ? ` de ${oldEmail}` : ""}
            {newEmail ? ` para ${newEmail}` : ""}. Confirme para concluir a alteração.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Confirmar novo e-mail
          </Button>
          <Text style={footer}>
            Se você não solicitou essa mudança, ignore este e-mail e verifique o acesso à sua conta.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default EmailChangeEmail;
