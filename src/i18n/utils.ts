import { defaultLang, ui, type Lang } from './ui';

export function getLangFromUrl(url: URL): Lang {
	const [, lang] = url.pathname.split('/');
	if (lang in ui) return lang as Lang;
	return defaultLang;
}

export function useTranslations(lang: Lang) {
	return function t(key: keyof (typeof ui)[typeof defaultLang]): string {
		return ui[lang][key] ?? ui[defaultLang][key];
	};
}

export function getLocalizedPath(path: string, targetLang: Lang): string {
	const segments = path.split('/').filter(Boolean);
	if (segments[0] in ui) {
		segments[0] = targetLang;
	} else {
		segments.unshift(targetLang);
	}
	return '/' + segments.join('/') + '/';
}

export function getSlugFromId(id: string): string {
	const parts = id.split('/');
	return parts.slice(1).join('/');
}

export function getLangFromId(id: string): Lang {
	const lang = id.split('/')[0];
	if (lang in ui) return lang as Lang;
	return defaultLang;
}
