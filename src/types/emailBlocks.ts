/** Web-safe stacks suitable for email clients */
export const EMAIL_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'System UI', value: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif' },
  { label: 'Arial', value: 'Arial,Helvetica,sans-serif' },
  { label: 'Georgia', value: 'Georgia,Times New Roman,serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS,Helvetica,sans-serif' },
  { label: 'Verdana', value: 'Verdana,Geneva,sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman,Times,serif' },
  { label: 'Courier New', value: 'Courier New,Courier,monospace' },
];

export type TextAlign = 'left' | 'center' | 'right';

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: TextAlign;
  lineHeight: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  backgroundColor: string;
}

export const defaultTextStyle = (): TextStyle => ({
  fontFamily: EMAIL_FONT_OPTIONS[0].value,
  fontSize: 16,
  fontWeight: 400,
  color: '#111827',
  textAlign: 'left',
  lineHeight: 1.5,
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 0,
  paddingRight: 0,
  backgroundColor: 'transparent',
});

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  style: TextStyle;
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string;
  alt: string;
  widthPercent: number;
  align: TextAlign;
  linkHref: string;
  paddingTop: number;
  paddingBottom: number;
}

export interface SignatureBlock {
  id: string;
  type: 'signature';
  name: string;
  title: string;
  line2: string;
  line3: string;
  nameStyle: TextStyle;
  detailStyle: TextStyle;
}

export interface ButtonBlock {
  id: string;
  type: 'button';
  label: string;
  href: string;
  align: TextAlign;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  backgroundColor: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
}

export interface DividerBlock {
  id: string;
  type: 'divider';
  color: string;
  thickness: number;
  marginTop: number;
  marginBottom: number;
}

export interface SpacerBlock {
  id: string;
  type: 'spacer';
  height: number;
}

/** Two-column layout; each side holds section blocks only (no nested columns). */
export interface ColumnsBlock {
  id: string;
  type: 'columns';
  gap: number;
  left: EmailSectionBlock[];
  right: EmailSectionBlock[];
}

export type EmailSectionBlock =
  | TextBlock
  | ImageBlock
  | SignatureBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock;

export type EmailBlock = EmailSectionBlock | ColumnsBlock;

export function isColumnsBlock(b: EmailBlock): b is ColumnsBlock {
  return b.type === 'columns';
}
