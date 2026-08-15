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

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de acesso ao {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Seu link de acesso</Heading>
          <Text style={text}>
            Use o botão abaixo para entrar no {siteName}. O link é de uso único e expira em breve.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Entrar agora
          </Button>
          <Text style={footer}>
            Se você não pediu este acesso, ignore este e-mail e não compartilhe o link.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default MagicLinkEmail;
