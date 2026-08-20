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

export interface NovaAtualizacaoEmailProps {
  obraNome: string;
  dataVisita: string;
  unidade?: string | undefined;
  destaque?: string | undefined;
  /** Um destaque por casa, para investidores com mais de um imóvel. */
  casas?: { unidade: string; destaque?: string | undefined }[] | undefined;
  url: string;
}

export const NovaAtualizacaoEmail = ({
  obraNome,
  dataVisita,
  unidade,
  destaque,
  casas,
  url,
}: NovaAtualizacaoEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Nova atualização da obra ${obraNome}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={brand}>ObraViva</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Nova atualização da sua obra</Heading>
          <Text style={text}>
            O engenheiro responsável publicou uma nova atualização de <strong>{obraNome}</strong>
            {unidade ? ` — ${unidade}` : ""}, referente à visita de {dataVisita}.
          </Text>
          {casas && casas.length > 0
            ? casas.map((casa) => (
                <Text key={casa.unidade} style={text}>
                  <strong>{casa.unidade}</strong>
                  {casa.destaque ? ` — ${casa.destaque}` : ""}
                </Text>
              ))
            : destaque
              ? <Text style={text}>{destaque}</Text>
              : null}
          <Button style={button} href={url}>
            Ver atualização
          </Button>
          <Text style={footer}>
            Você recebeu este e-mail porque está vinculado a esta obra no ObraViva.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default NovaAtualizacaoEmail;

