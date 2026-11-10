import { describe, expect, it } from 'vitest';
import {
  createSlideEmbed,
  extractIframeSrc,
  getOfficeViewerSrc,
  getUploadedSlideFileType,
  isAllowedSlideEmbedSrc,
  parseSlideEmbed,
  resolveLessonSlides,
  type UploadedSlide
} from '@cio/utils/functions';
import { ZLessonSlide } from '@cio/utils/validation/lesson';

describe('slide embed parsing', () => {
  it('extracts src from a full iframe and ignores width and height', () => {
    const raw =
      '<iframe src="https://docs.google.com/presentation/d/e/2PACX-abc/embed" width="320" height="200"></iframe>';

    expect(extractIframeSrc(raw)).toBe('https://docs.google.com/presentation/d/e/2PACX-abc/embed');
  });

  it('normalizes a Google Slides publish link into the embed src', () => {
    const parsed = parseSlideEmbed(
      '<iframe src="https://docs.google.com/presentation/d/e/2PACX-abc/pub?start=false"></iframe>'
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.platform).toBe('google-slides');
    expect(parsed.src).toContain('/embed');
    expect(parsed.src).not.toContain('/pub');
  });

  it('keeps Google Slides publish-to-web pubembed paths intact', () => {
    const parsed = parseSlideEmbed(
      '<iframe src="https://docs.google.com/presentation/d/e/2PACX-abc/pubembed?start=false&loop=false&delayms=3000" frameborder="0" width="960" height="569" allowfullscreen="true"></iframe>'
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.platform).toBe('google-slides');
    expect(parsed.src).toBe(
      'https://docs.google.com/presentation/d/e/2PACX-abc/pubembed?start=false&loop=false&delayms=3000'
    );
  });

  it('appends Canva embed query and drops pasted dimensions from storage', () => {
    const created = createSlideEmbed(
      '<iframe src="https://www.canva.com/design/DAFDemo/view" width="1200" height="800"></iframe>',
      'slide-1'
    );

    expect(created).toEqual({
      id: 'slide-1',
      platform: 'canva',
      src: 'https://www.canva.com/design/DAFDemo/view?embed'
    });
  });

  it('rejects an unsupported host', () => {
    const parsed = parseSlideEmbed('<iframe src="https://example.com/deck"></iframe>');

    expect(parsed).toEqual({ ok: false, reason: 'unsupported' });
    expect(isAllowedSlideEmbedSrc('https://example.com/deck')).toBe(false);
  });

  it('hydrates a legacy slideUrl when slides is empty', () => {
    const slides = resolveLessonSlides([], 'https://www.canva.com/design/DAFLegacy/view');

    expect(slides).toHaveLength(1);
    expect(slides[0]?.platform).toBe('canva');
    expect(slides[0]?.src).toContain('embed');
  });

  it('accepts Figma, Pitch, and PowerPoint iframe src hosts', () => {
    const figma = parseSlideEmbed(
      '<iframe src="https://embed.figma.com/slides/DemoFileKey123" width="800" height="450"></iframe>'
    );
    const pitch = parseSlideEmbed('<iframe src="https://pitch.com/embed/demo-pitch-public-id"></iframe>');
    const powerpoint = parseSlideEmbed(
      '<iframe src="https://onedrive.live.com/embed?resid=DEMO123&authkey=Ademo&em=2" width="640" height="480"></iframe>'
    );

    expect(figma.ok && figma.platform).toBe('figma');
    expect(pitch.ok && pitch.platform).toBe('pitch');
    expect(powerpoint.ok && powerpoint.platform).toBe('powerpoint');

    if (figma.ok) {
      expect(figma.src).toContain('embed-host=classroomio');
    }
  });
});

describe('uploaded slides', () => {
  const uploadedSlide: UploadedSlide = {
    id: 'uploaded-1',
    src: 'https://storage.example.com/documents/org/deck.pdf?signature=abc',
    platform: 'upload',
    key: 'org/deck.pdf',
    name: 'Deck.pdf',
    size: 2048,
    fileType: 'pdf'
  };

  it('keeps uploaded slides alongside embeds when resolving lesson slides', () => {
    const canvaSlide = createSlideEmbed('https://www.canva.com/design/DAFDemo/view', 'canva-1');
    const slides = resolveLessonSlides([uploadedSlide, canvaSlide!]);

    expect(slides.map((slide) => slide.id)).toEqual(['uploaded-1', 'canva-1']);
  });

  it('validates uploaded slides and rejects unsupported file types', () => {
    expect(ZLessonSlide.safeParse(uploadedSlide).success).toBe(true);
    expect(ZLessonSlide.safeParse({ ...uploadedSlide, fileType: 'exe' }).success).toBe(false);
    expect(ZLessonSlide.safeParse({ ...uploadedSlide, key: '' }).success).toBe(false);
  });

  it('detects PDF and PPTX files by MIME type or extension', () => {
    expect(getUploadedSlideFileType({ name: 'deck.pdf', type: 'application/pdf' })).toBe('pdf');
    expect(getUploadedSlideFileType({ name: 'Deck.PPTX', type: '' })).toBe('pptx');
    expect(getUploadedSlideFileType({ name: 'deck.ppt', type: 'application/vnd.ms-powerpoint' })).toBeNull();
  });

  it('encodes the file URL for the Office Online viewer', () => {
    expect(getOfficeViewerSrc('https://storage.example.com/deck.pptx?a=1&b=2')).toBe(
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fstorage.example.com%2Fdeck.pptx%3Fa%3D1%26b%3D2'
    );
  });
});
