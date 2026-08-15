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

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidado para o {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Você foi convidado</Heading>
          <Text style={text}>
            Seu acesso ao {siteName} foi liberado. Aceite o convite para criar sua senha e
            acompanhar o andamento da obra.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Aceitar convite
          </Button>
          <Text style={footer}>Se você não esperava este convite, ignore este e-mail.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default InviteEmail;
