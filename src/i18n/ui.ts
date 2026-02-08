export const languages = {
	en: 'English',
	ko: '한국어',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'en';

export const ui = {
	en: {
		'site.title': "Sunhong Min's Tech Blog",
		'site.description': 'Personal tech blog covering DevOps, cloud infrastructure, and software engineering.',
		'nav.home': 'Home',
		'nav.blog': 'Blog',
		'nav.about': 'About',
		'home.intro':
			"Hi, I'm Sunhong (Shawn) Min, an SRE/DevOps Engineer sharing insights on cloud infrastructure, Kubernetes, automation, and software engineering.",
		'home.recentPosts': 'Recent Posts',
		'home.viewAll': 'View all posts',
		'blog.lastUpdated': 'Last updated on',
		'blog.allPosts': 'All Posts',
		'blog.readingTime': 'min read',
		'blog.relatedPosts': 'Related Posts',
		'blog.tableOfContents': 'Table of Contents',
		'post.minRead': 'min read',
		'post.share': 'Share',
		'footer.copyright': 'Sunhong Min. All rights reserved.',
	},
	ko: {
		'site.title': '민선홍 기술 블로그',
		'site.description': 'DevOps, 클라우드 인프라, 소프트웨어 엔지니어링에 대한 기술 블로그입니다.',
		'nav.home': '홈',
		'nav.blog': '블로그',
		'nav.about': '소개',
		'home.intro':
			'안녕하세요, 클라우드 인프라, Kubernetes, 자동화, 소프트웨어 엔지니어링에 대한 인사이트를 공유하는 SRE/DevOps 엔지니어 민선홍입니다.',
		'home.recentPosts': '최근 글',
		'home.viewAll': '모든 글 보기',
		'blog.lastUpdated': '최종 수정일:',
		'blog.allPosts': '전체 글',
		'blog.readingTime': '분 읽기',
		'blog.relatedPosts': '관련 글',
		'blog.tableOfContents': '목차',
		'post.minRead': '분 읽기',
		'post.share': '공유',
		'footer.copyright': '민선홍. All rights reserved.',
	},
} as const;
