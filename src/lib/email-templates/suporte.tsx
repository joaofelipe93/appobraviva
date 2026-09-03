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
import { brand, button, container, content, footer, h1, header, main, text } from "./estilos";

export interface SuporteEmailProps {
  titulo: string;
  intro: string;
  assunto: string;
  detalhe?: string | undefined;
  url: string;
  rodape: string;
}

export const SuporteEmail = ({
  titulo,
  intro,
  assunto,
  detalhe,
  url,
  rodape,
}: SuporteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{titulo}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>ObraViva</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>{titulo}</Heading>
          <Text style={text}>{intro}</Text>
          <Text style={text}>
            <strong>Assunto:</strong> {assunto}
          </Text>
          {detalhe ? <Text style={text}>{detalhe}</Text> : null}
          <Button style={button} href={url}>
            Abrir chamado
          </Button>
          <Text style={footer}>{rodape}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default SuporteEmail;
