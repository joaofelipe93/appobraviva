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

interface SignupEmailProps {
  siteName: string;
  siteUrl: string;
  recipient: string;
  confirmationUrl: string;
}

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail para acessar o {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>{siteName}</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Confirme seu e-mail</Heading>
          <Text style={text}>
            Recebemos um cadastro no {siteName} com o e-mail {recipient}. Confirme para liberar o
            acesso ao acompanhamento da sua obra.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Confirmar e-mail
          </Button>
          <Text style={footer}>
            Se você não fez esse cadastro, ignore este e-mail. Nenhuma conta será ativada.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default SignupEmail;
