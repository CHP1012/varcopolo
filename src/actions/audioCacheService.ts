'use server';

/**
 * Audio Cache Service
 * Firebase Storage를 사용하여 ElevenLabs 생성 오디오를 캐싱
 * 
 * 목표:
 * 1. 크레딧 절약: 같은 소리 반복 생성 방지
 * 2. 속도 향상: 캐시 히트 시 즉시 반환
 * 3. 일관성: 같은 상황에서 같은 소리
 */

// ============================
// 카테고리 정의 (키워드 → 카테고리 매핑)
// ============================

// Internal interface - not exported from 'use server'
interface AudioCategory {
    id: string;
    type: 'sfx' | 'bgm';
    keywords: string[];
    description: string;
}

// Internal constant - not exported from 'use server'
const AUDIO_CATEGORIES: AudioCategory[] = [
    // 날씨/자연
    { id: 'weather_rain', type: 'sfx', keywords: ['비', '빗소리', 'rain', '장마', '빗물', '폭우', '소나기'], description: 'Rain sounds' },
    { id: 'weather_thunder', type: 'sfx', keywords: ['천둥', '번개', 'thunder', '뇌우'], description: 'Thunder' },
    { id: 'weather_wind', type: 'sfx', keywords: ['바람', 'wind', '폭풍', '돌풍'], description: 'Wind sounds' },

    // 군중/사람
    { id: 'crowd_busy', type: 'sfx', keywords: ['군중', '사람들', '붐비는', '시장', '번화가', '혼잡'], description: 'Busy crowd' },
    { id: 'crowd_murmur', type: 'sfx', keywords: ['웅성', '수군', '속삭임', '대화', '잡담'], description: 'Murmuring crowd' },
    { id: 'crowd_cheer', type: 'sfx', keywords: ['환호', '박수', '축하', '응원'], description: 'Cheering crowd' },

    // 발소리
    { id: 'footsteps_run', type: 'sfx', keywords: ['달리는', '뛰는', '달려', '질주', '도망', 'run'], description: 'Running footsteps' },
    { id: 'footsteps_walk', type: 'sfx', keywords: ['걷는', '발걸음', '걸어', 'walk', '천천히'], description: 'Walking footsteps' },
    { id: 'footsteps_sneak', type: 'sfx', keywords: ['살금살금', '몰래', '숨어', 'sneak', '조용히'], description: 'Sneaking footsteps' },

    // 기계/테크
    { id: 'machine_hum', type: 'sfx', keywords: ['기계', '윙윙', '장치', '작동', '모터', 'hum'], description: 'Machine humming' },
    { id: 'machine_boot', type: 'sfx', keywords: ['부팅', '시동', '전원', '켜지', 'boot', '활성화'], description: 'Boot/startup sound' },
    { id: 'machine_beep', type: 'sfx', keywords: ['비프', '알림', '경고음', 'beep', '신호'], description: 'Beep/alert sound' },
    { id: 'machine_glitch', type: 'sfx', keywords: ['글리치', '오류', '노이즈', 'glitch', '깨지'], description: 'Glitch/error sound' },
    { id: 'machine_welding', type: 'sfx', keywords: ['용접', '용접기', '스파크', 'weld', '불꽃'], description: 'Welding sound' },

    // 문/이동
    { id: 'door_open', type: 'sfx', keywords: ['문', '열리', '삐걱', 'door', '출입'], description: 'Door opening' },
    { id: 'door_knock', type: 'sfx', keywords: ['노크', '두드리', 'knock', '똑똑'], description: 'Door knock' },
    { id: 'door_slam', type: 'sfx', keywords: ['쾅', '닫히', 'slam', '문닫'], description: 'Door slamming' },

    // 환경/분위기
    { id: 'ambient_night', type: 'sfx', keywords: ['밤', '귀뚜라미', '고요', '적막', 'night', '야간'], description: 'Night ambience' },
    { id: 'ambient_city', type: 'sfx', keywords: ['도시', '네온', '차소리', '교통', 'city', '거리'], description: 'City ambience' },
    { id: 'ambient_forest', type: 'sfx', keywords: ['숲', '새소리', '자연', 'forest', '나무'], description: 'Forest ambience' },
    { id: 'ambient_water', type: 'sfx', keywords: ['물', '파도', '강', '개울', 'water', '흐르'], description: 'Water sounds' },

    // 전투/액션
    { id: 'combat_punch', type: 'sfx', keywords: ['때리', '주먹', '타격', 'punch', '맞'], description: 'Punch impact' },
    { id: 'combat_slash', type: 'sfx', keywords: ['베다', '칼', '검', 'slash', '휘두르'], description: 'Blade slash' },
    { id: 'combat_gunshot', type: 'sfx', keywords: ['총', '발사', '총성', 'gun', 'shot'], description: 'Gunshot' },
    { id: 'combat_explosion', type: 'sfx', keywords: ['폭발', '터지', 'explosion', 'boom', '파괴'], description: 'Explosion' },

    // BGM 카테고리
    { id: 'bgm_tension', type: 'bgm', keywords: ['긴장', '추격', '위험', '스릴', 'tension', 'chase'], description: 'Tension/chase music' },
    { id: 'bgm_peaceful', type: 'bgm', keywords: ['평화', '고요', '안전', '휴식', 'peaceful', 'calm'], description: 'Peaceful music' },
    { id: 'bgm_mystery', type: 'bgm', keywords: ['미스터리', '수수께끼', '의문', 'mystery', '이상한'], description: 'Mystery music' },
    { id: 'bgm_sad', type: 'bgm', keywords: ['슬픔', '눈물', '이별', '안타까', 'sad', '애잔'], description: 'Sad music' },
    { id: 'bgm_action', type: 'bgm', keywords: ['액션', '전투', '싸움', 'action', 'battle', 'fight'], description: 'Action/battle music' },
];

// ============================
// 카테고리 매칭 함수
// ============================

/**
 * 텍스트에서 가장 적합한 오디오 카테고리를 찾습니다.
 * @param context 상황 설명 텍스트
 * @param type 'sfx' | 'bgm' | 'any'
 * @returns 매칭된 카테고리 또는 null
 */
export async function matchAudioCategory(
    context: string,
    type: 'sfx' | 'bgm' | 'any' = 'any'
): Promise<AudioCategory | null> {
    const lowerContext = context.toLowerCase();

    let bestMatch: AudioCategory | null = null;
    let bestScore = 0;

    for (const category of AUDIO_CATEGORIES) {
        // 타입 필터링
        if (type !== 'any' && category.type !== type) continue;

        // 키워드 매칭 점수 계산
        let score = 0;
        for (const keyword of category.keywords) {
            if (lowerContext.includes(keyword.toLowerCase())) {
                score += keyword.length; // 긴 키워드일수록 높은 점수
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = category;
        }
    }

    if (bestMatch) {
        console.log(`[AudioCache] Category matched: ${bestMatch.id} (score: ${bestScore})`);
    }

    return bestMatch;
}

// ============================
// Firebase 캐시 조회/저장
// ============================

interface CachedAudio {
    url: string;
    categoryId: string;
    type: 'sfx' | 'bgm';
    createdAt: number;
}

/**
 * Firebase에서 캐싱된 오디오 URL을 조회합니다.
 * @param categoryId 카테고리 ID (예: 'weather_rain')
 * @returns 캐시된 오디오 URL 또는 null
 */
export async function getCachedAudio(categoryId: string): Promise<string | null> {
    try {
        const { db, isFirebaseConfigured } = await import('@/lib/firebase');

        if (!isFirebaseConfigured || !db) {
            console.log('[AudioCache] Firebase not configured, skipping cache lookup');
            return null;
        }

        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'audio_cache', categoryId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as CachedAudio;
            console.log(`[AudioCache] ✅ Cache HIT: ${categoryId}`);

            // 사용 횟수 증가 (비동기, 기다리지 않음)
            incrementUseCount(categoryId);

            return data.url;
        }

        console.log(`[AudioCache] ❌ Cache MISS: ${categoryId}`);
        return null;

    } catch (error) {
        console.error('[AudioCache] Error getting cached audio:', error);
        return null;
    }
}

/**
 * 새로 생성된 오디오를 Firebase에 캐싱합니다.
 * @param categoryId 카테고리 ID
 * @param audioUrl 오디오 URL (ElevenLabs 또는 Firebase Storage URL)
 * @param type 'sfx' | 'bgm'
 */
export async function cacheAudio(
    categoryId: string,
    audioUrl: string,
    type: 'sfx' | 'bgm'
): Promise<void> {
    try {
        const { db, storage, isFirebaseConfigured } = await import('@/lib/firebase');

        if (!isFirebaseConfigured || !db || !storage) {
            console.log('[AudioCache] Firebase not configured, skipping cache save');
            return;
        }

        // 1. 오디오 파일을 Firebase Storage에 업로드 (URL이 ElevenLabs URL인 경우)
        let storageUrl = audioUrl;

        if (audioUrl.startsWith('data:') || audioUrl.includes('elevenlabs')) {
            // Base64 또는 ElevenLabs URL인 경우 Storage에 업로드
            storageUrl = await uploadAudioToStorage(categoryId, audioUrl, type);
        }

        // 2. Firestore에 메타데이터 저장
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'audio_cache', categoryId);

        const cacheData: CachedAudio & { useCount: number } = {
            url: storageUrl,
            categoryId,
            type,
            createdAt: Date.now(),
            useCount: 1
        };

        await setDoc(docRef, cacheData);
        console.log(`[AudioCache] ✅ Cached: ${categoryId} → ${storageUrl.substring(0, 50)}...`);

    } catch (error) {
        console.error('[AudioCache] Error caching audio:', error);
    }
}

/**
 * 오디오 파일을 Firebase Storage에 업로드합니다.
 */
async function uploadAudioToStorage(
    categoryId: string,
    audioSource: string,
    type: 'sfx' | 'bgm'
): Promise<string> {
    const { storage } = await import('@/lib/firebase');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

    if (!storage) throw new Error('Storage not available');

    // Fetch audio data
    let audioBlob: Blob;

    if (audioSource.startsWith('data:')) {
        // Base64 디코딩
        const base64Data = audioSource.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
    } else {
        // URL에서 fetch
        const response = await fetch(audioSource);
        audioBlob = await response.blob();
    }

    // Upload to Storage
    const filePath = `audio_cache/${type}/${categoryId}.mp3`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, audioBlob);
    const downloadUrl = await getDownloadURL(storageRef);

    console.log(`[AudioCache] Uploaded to Storage: ${filePath}`);
    return downloadUrl;
}

/**
 * 캐시 사용 횟수를 증가시킵니다.
 */
async function incrementUseCount(categoryId: string): Promise<void> {
    try {
        const { db } = await import('@/lib/firebase');
        if (!db) return;

        const { doc, updateDoc, increment } = await import('firebase/firestore');
        const docRef = doc(db, 'audio_cache', categoryId);

        await updateDoc(docRef, {
            useCount: increment(1),
            lastUsedAt: Date.now()
        });
    } catch (error) {
        // 조용히 실패 (중요하지 않음)
    }
}

// ============================
// 통합 함수: 캐시 우선 오디오 가져오기
// ============================

// Internal interface - not exported from 'use server'
interface AudioCacheResult {
    url: string;
    fromCache: boolean;
    categoryId: string | null;
}

/**
 * 컨텍스트에 맞는 오디오를 가져옵니다.
 * 캐시에 있으면 캐시에서, 없으면 생성기 함수를 호출합니다.
 * 
 * @param context 상황 설명
 * @param type 'sfx' | 'bgm'
 * @param generator 캐시 미스 시 호출할 생성 함수
 */
export async function getAudioWithCache(
    context: string,
    type: 'sfx' | 'bgm',
    generator: () => Promise<string | null>
): Promise<AudioCacheResult | null> {
    // 1. 카테고리 매칭
    const category = await matchAudioCategory(context, type);

    if (category) {
        // 2. 캐시 조회
        const cachedUrl = await getCachedAudio(category.id);

        if (cachedUrl) {
            return {
                url: cachedUrl,
                fromCache: true,
                categoryId: category.id
            };
        }
    }

    // 3. 캐시 미스 - 새로 생성
    console.log(`[AudioCache] Generating new ${type}...`);
    const generatedUrl = await generator();

    if (generatedUrl && category) {
        // 4. 생성된 오디오 캐싱 (비동기)
        cacheAudio(category.id, generatedUrl, type).catch(console.error);
    }

    return generatedUrl ? {
        url: generatedUrl,
        fromCache: false,
        categoryId: category?.id || null
    } : null;
}
