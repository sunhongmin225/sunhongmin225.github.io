import type { Lang } from '../i18n/ui';

/**
 * Calculate reading time from raw markdown content.
 * Korean: ~500 chars/min (character-based)
 * English: ~230 words/min (word-based)
 */
export function getReadingTime(content: string, lang: Lang): number {
	// Strip frontmatter
	const body = content.replace(/^---[\s\S]*?---/, '').trim();

	if (lang === 'ko') {
		// For Korean, count characters (excluding whitespace and markdown syntax)
		const cleaned = body.replace(/[#*`\[\]()>|\-_~!]/g, '').replace(/\s+/g, '');
		return Math.max(1, Math.ceil(cleaned.length / 500));
	}

	// For English, count words
	const words = body.split(/\s+/).filter((w) => w.length > 0);
	return Math.max(1, Math.ceil(words.length / 230));
}
