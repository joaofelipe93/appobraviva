import * as React from "react";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { brand, codigo, container, content, footer, h1, header, main, text } from "./estilos";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>ObraViva</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Código de verificação</Heading>
          <Text style={text}>Use o código abaixo para confirmar esta ação na sua conta:</Text>
          <Text style={codigo}>{token}</Text>
          <Text style={footer}>
            O código expira em poucos minutos. Nunca compartilhe este código com outras pessoas.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default ReauthenticationEmail;
