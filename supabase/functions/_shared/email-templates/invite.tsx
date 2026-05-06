/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to ManWinWin PartnerOS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandHeader}>
          <Text style={brandMark}>ManWinWin <span style={brandAccent}>PartnerOS</span></Text>
        </Section>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You have been invited to access the ManWinWin PartnerOS platform.
        </Text>
        <Text style={text}>
          This platform allows partners to collaboratively manage opportunities, proposals,
          clients, licenses and renewals with ManWinWin.
        </Text>
        <Section style={{ margin: '28px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Text style={smallText}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Section style={footer}>
          <Text style={footerStrong}>ManWinWin PartnerOS</Text>
          <Text style={footerLine}>Powered by Navaltik Management</Text>
          <Text style={footerLine}>
            <Link href="https://www.manwinwin.com" style={footerLink}>www.manwinwin.com</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', system-ui, -apple-system, Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandHeader = { paddingBottom: '24px', borderBottom: '1px solid hsl(210, 14%, 92%)', marginBottom: '28px' }
const brandMark = { fontSize: '16px', fontWeight: '700' as const, color: 'hsl(207, 18%, 20%)', margin: 0, letterSpacing: '-0.2px' }
const brandAccent = { color: 'hsl(353, 94%, 55%)' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(207, 18%, 20%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(207, 14%, 35%)', lineHeight: '1.6', margin: '0 0 14px' }
const smallText = { fontSize: '13px', color: 'hsl(207, 14%, 50%)', lineHeight: '1.5', margin: '20px 0 0' }
const button = {
  backgroundColor: 'hsl(353, 94%, 55%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: 'hsl(210, 14%, 92%)', margin: '32px 0 20px' }
const footer = { textAlign: 'center' as const }
const footerStrong = { fontSize: '12px', fontWeight: '600' as const, color: 'hsl(207, 18%, 30%)', margin: '0 0 4px' }
const footerLine = { fontSize: '11px', color: 'hsl(207, 14%, 55%)', margin: '0 0 2px' }
const footerLink = { color: 'hsl(353, 94%, 55%)', textDecoration: 'none' }
