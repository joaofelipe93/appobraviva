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

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinição de senha do {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Redefinir sua senha</Heading>
          <Text style={text}>
            Recebemos um pedido para redefinir a senha da sua conta no {siteName}. Clique no botão
            abaixo para criar uma nova senha. O link expira em 1 hora.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Criar nova senha
          </Button>
          <Text style={footer}>
            Se você não solicitou a redefinição, ignore este e-mail — sua senha atual continua
            válida.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default RecoveryEmail;
