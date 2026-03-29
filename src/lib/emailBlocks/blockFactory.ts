import type {
  ButtonBlock,
  ColumnsBlock,
  DividerBlock,
  EmailBlock,
  EmailSectionBlock,
  ImageBlock,
  SignatureBlock,
  SpacerBlock,
  TextBlock,
} from '../../types/emailBlocks';
import { defaultTextStyle, EMAIL_FONT_OPTIONS } from '../../types/emailBlocks';

const nid = () => crypto.randomUUID();

export function createTextBlock(): TextBlock {
  return {
    id: nid(),
    type: 'text',
    content: 'Hi {{FirstName}},\n\nThanks for connecting with us.',
    style: defaultTextStyle(),
  };
}

export function createImageBlock(): ImageBlock {
  return {
    id: nid(),
    type: 'image',
    src: '',
    alt: '',
    widthPercent: 100,
    align: 'center',
    linkHref: '',
    paddingTop: 8,
    paddingBottom: 8,
  };
}

export function createSignatureBlock(): SignatureBlock {
  const boldName = { ...defaultTextStyle(), fontWeight: 700, fontSize: 17 };
  const small = { ...defaultTextStyle(), fontSize: 14, color: '#4b5563' };
  return {
    id: nid(),
    type: 'signature',
    name: '{{FirstName}} {{LastName}}',
    title: 'Account Executive',
    line2: '{{Phone}}',
    line3: '{{Email}}',
    nameStyle: boldName,
    detailStyle: small,
  };
}

export function createButtonBlock(): ButtonBlock {
  return {
    id: nid(),
    type: 'button',
    label: 'Book a call',
    href: 'https://example.com',
    align: 'center',
    fontFamily: EMAIL_FONT_OPTIONS[0].value,
    fontSize: 15,
    fontWeight: 600,
    textColor: '#ffffff',
    backgroundColor: '#007aff',
    borderRadius: 8,
    paddingX: 20,
    paddingY: 12,
  };
}

export function createDividerBlock(): DividerBlock {
  return {
    id: nid(),
    type: 'divider',
    color: '#e5e7eb',
    thickness: 2,
    marginTop: 12,
    marginBottom: 12,
  };
}

export function createSpacerBlock(): SpacerBlock {
  return { id: nid(), type: 'spacer', height: 24 };
}

export function createColumnsBlock(): ColumnsBlock {
  return { id: nid(), type: 'columns', gap: 16, left: [], right: [] };
}

export type SectionType = EmailSectionBlock['type'];

export function createSectionBlock(type: SectionType): EmailSectionBlock {
  switch (type) {
    case 'text':
      return createTextBlock();
    case 'image':
      return createImageBlock();
    case 'signature':
      return createSignatureBlock();
    case 'button':
      return createButtonBlock();
    case 'divider':
      return createDividerBlock();
    case 'spacer':
      return createSpacerBlock();
    default:
      return createTextBlock();
  }
}

export function createBlockForToolbar(type: EmailBlock['type'] | 'columns'): EmailBlock {
  if (type === 'columns') {
    return createColumnsBlock();
  }
  return createSectionBlock(type);
}
