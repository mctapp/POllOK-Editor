/**
 * 오디오 무음 트리밍 유틸리티
 * 녹음 시작 부분의 무음 구간을 자동으로 제거합니다.
 */

// 무음 감지 임계값 (0-1 사이, 낮을수록 민감)
const SILENCE_THRESHOLD = 0.01;
// 최소 무음 지속 시간 (ms) - 이 시간 이상의 무음만 트리밍
const MIN_SILENCE_DURATION_MS = 50;

/**
 * 오디오 Blob에서 시작 부분 무음을 제거합니다.
 * @param audioBlob 원본 오디오 Blob (webm 형식)
 * @returns 무음이 제거된 오디오 Blob
 */
export async function trimSilenceFromStart(audioBlob: Blob): Promise<Blob> {
  try {
    // AudioContext 생성
    const audioContext = new AudioContext();

    // Blob을 ArrayBuffer로 변환
    const arrayBuffer = await audioBlob.arrayBuffer();

    // 오디오 디코딩
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 무음 끝 지점 찾기
    const silenceEndSample = findSilenceEnd(audioBuffer, SILENCE_THRESHOLD, MIN_SILENCE_DURATION_MS);

    // 무음이 없거나 매우 짧으면 원본 반환
    if (silenceEndSample <= audioBuffer.sampleRate * 0.05) {
      // 50ms 이하면 트리밍 안 함
      await audioContext.close();
      return audioBlob;
    }

    // 트리밍된 오디오 버퍼 생성
    const trimmedBuffer = trimAudioBuffer(audioBuffer, silenceEndSample);

    // 트리밍된 버퍼를 Blob으로 인코딩
    const trimmedBlob = await encodeAudioBufferToWebM(trimmedBuffer);

    await audioContext.close();

    console.log(
      `무음 트리밍 완료: ${((silenceEndSample / audioBuffer.sampleRate) * 1000).toFixed(0)}ms 제거됨`
    );

    return trimmedBlob;
  } catch (error) {
    console.error('무음 트리밍 실패, 원본 사용:', error);
    return audioBlob;
  }
}

/**
 * 오디오 버퍼에서 무음이 끝나는 샘플 인덱스를 찾습니다.
 */
function findSilenceEnd(
  audioBuffer: AudioBuffer,
  threshold: number,
  minDurationMs: number
): number {
  const sampleRate = audioBuffer.sampleRate;
  const minSamples = Math.floor((minDurationMs / 1000) * sampleRate);

  // 첫 번째 채널 데이터 사용 (모노 또는 스테레오 좌측)
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;

  let consecutiveAboveThreshold = 0;
  const requiredConsecutive = Math.floor(sampleRate * 0.01); // 10ms 연속 소리

  for (let i = 0; i < totalSamples; i++) {
    const sample = Math.abs(channelData[i]);

    if (sample > threshold) {
      consecutiveAboveThreshold++;
      if (consecutiveAboveThreshold >= requiredConsecutive) {
        // 소리가 시작된 지점 (약간 앞에서 시작하여 자연스러운 시작)
        const startOffset = Math.max(0, i - consecutiveAboveThreshold - Math.floor(sampleRate * 0.02)); // 20ms 여유
        return Math.max(startOffset, minSamples);
      }
    } else {
      consecutiveAboveThreshold = 0;
    }
  }

  // 무음만 있는 경우 (전체가 무음)
  return 0;
}

/**
 * 오디오 버퍼를 지정된 샘플부터 시작하도록 트리밍합니다.
 */
function trimAudioBuffer(audioBuffer: AudioBuffer, startSample: number): AudioBuffer {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const newLength = audioBuffer.length - startSample;

  if (newLength <= 0) {
    return audioBuffer;
  }

  // 새 AudioContext로 새 버퍼 생성
  const offlineContext = new OfflineAudioContext(numberOfChannels, newLength, sampleRate);
  const trimmedBuffer = offlineContext.createBuffer(numberOfChannels, newLength, sampleRate);

  // 각 채널 데이터 복사
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel);
    const destData = trimmedBuffer.getChannelData(channel);
    for (let i = 0; i < newLength; i++) {
      destData[i] = sourceData[startSample + i];
    }
  }

  return trimmedBuffer;
}

/**
 * AudioBuffer를 WebM Blob으로 인코딩합니다.
 */
async function encodeAudioBufferToWebM(audioBuffer: AudioBuffer): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    // OfflineAudioContext를 사용하여 오디오 처리
    const offlineContext = new OfflineAudioContext(
      numberOfChannels,
      audioBuffer.length,
      sampleRate
    );

    // 버퍼 소스 생성
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // MediaStreamDestination을 직접 사용할 수 없으므로
    // AudioContext와 MediaRecorder를 사용
    const audioContext = new AudioContext({ sampleRate });
    const destination = audioContext.createMediaStreamDestination();

    // BufferSource를 destination에 연결
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(destination);

    // MediaRecorder 설정
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm',
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      audioContext.close();
      const blob = new Blob(chunks, { type: 'audio/webm' });
      resolve(blob);
    };

    mediaRecorder.onerror = (error) => {
      audioContext.close();
      reject(error);
    };

    // 녹음 시작
    mediaRecorder.start();
    bufferSource.start(0);

    // 버퍼 길이만큼 재생 후 중지
    const durationMs = (audioBuffer.length / sampleRate) * 1000;
    setTimeout(() => {
      bufferSource.stop();
      mediaRecorder.stop();
    }, durationMs + 100); // 약간의 여유 추가
  });
}
