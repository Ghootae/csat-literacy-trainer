import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import {
  OpenAIDialogueEvaluator,
  parseEffort,
  type DialogueEffort,
} from './evaluator.js';
import {
  AVAILABLE_DIALOGUE_PARAGRAPH_IDS,
  AVAILABLE_DIALOGUE_PASSAGE_IDS,
  DEFAULT_DIALOGUE_PARAGRAPH_ID,
  loadDiagnosticGold,
  paragraphIdsForPassage,
} from './gold.js';
import { DialogueSessionEngine, formatStudentStep } from './session.js';

export interface DialogueCliOptions {
  readonly paragraphId: string | null;
  readonly passageId: string | null;
  readonly debug: boolean;
  readonly model?: string;
  readonly effort?: DialogueEffort;
  readonly help: boolean;
}

export const DIALOGUE_CLI_USAGE = `사용법:
  npm run experiment:dialogue
  npm run experiment:dialogue -- --paragraph <paragraph-id>
  npm run experiment:dialogue -- --passage <passage-id>

옵션:
  --paragraph <id>  실험 문단 ID (기본: ${DEFAULT_DIALOGUE_PARAGRAPH_ID})
  --passage <id>    지문의 모든 문단을 원문 순서로 실행
  --model <model>   OpenAI 모델 (기본: gpt-5.6-terra)
  --effort <level>  none | low | medium | high | xhigh | max (기본: medium)
  --debug           내부 structured output과 호출 메타데이터 표시
  --help            도움말 표시

입력 중 quit 또는 q를 입력하면 세션을 중단합니다.
후속 질문은 최대 3회입니다.
사용 가능한 문단: ${AVAILABLE_DIALOGUE_PARAGRAPH_IDS.join(', ')}
사용 가능한 전체 지문: ${AVAILABLE_DIALOGUE_PASSAGE_IDS.join(', ')}
필수 환경 변수: OPENAI_API_KEY`;

export function formatDebugEvaluation(value: unknown): string {
  return `[debug]\n${JSON.stringify(value, null, 2)}`;
}

export function parseDialogueCliArgs(argv: readonly string[]): DialogueCliOptions {
  let paragraphId: string | null = null;
  let passageId: string | null = null;
  let debug = false;
  let model: string | undefined;
  let effort: DialogueEffort | undefined;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === '--debug') {
      debug = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--paragraph' || arg === '--passage' || arg === '--model' || arg === '--effort') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${arg} 옵션에 값이 필요합니다.`);
      }
      index += 1;
      if (arg === '--paragraph') paragraphId = value;
      else if (arg === '--passage') passageId = value;
      else if (arg === '--model') model = value;
      else effort = parseEffort(value);
      continue;
    }
    throw new Error(`알 수 없는 옵션입니다: ${arg}`);
  }

  if (paragraphId !== null && passageId !== null) {
    throw new Error('--paragraph와 --passage는 함께 사용할 수 없습니다.');
  }
  if (paragraphId === null && passageId === null) paragraphId = DEFAULT_DIALOGUE_PARAGRAPH_ID;

  return {
    paragraphId,
    passageId,
    debug,
    ...(model === undefined ? {} : { model }),
    ...(effort === undefined ? {} : { effort }),
    help,
  };
}

export function resolveDialogueParagraphIds(options: DialogueCliOptions): readonly string[] {
  if (options.passageId !== null) return paragraphIdsForPassage(options.passageId);
  if (options.paragraphId !== null) return [options.paragraphId];
  throw new Error('실행할 문단 또는 지문이 없습니다.');
}

function wantsToQuit(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'quit' || normalized === 'q';
}

export async function runDialogueCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const options = parseDialogueCliArgs(argv);
  if (options.help) {
    console.log(DIALOGUE_CLI_USAGE);
    return;
  }

  const paragraphIds = resolveDialogueParagraphIds(options);
  const evaluator = new OpenAIDialogueEvaluator({
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(options.effort === undefined ? {} : { effort: options.effort }),
  });
  const terminal = createInterface({ input, output });

  try {
    if (options.passageId !== null) {
      console.log(`\n전체 지문 실험: ${options.passageId} (${paragraphIds.length}개 문단)`);
    }

    for (let index = 0; index < paragraphIds.length; index += 1) {
      const paragraphId = paragraphIds[index]!;
      const loaded = loadDiagnosticGold(paragraphId);
      const engine = new DialogueSessionEngine({
        evaluator,
        gold: loaded.gold,
        goldVersion: loaded.version,
        goldHash: loaded.hash,
      });

      console.log(`\n${paragraphIds.length > 1 ? `[${index + 1}/${paragraphIds.length}] ` : ''}문단 원문\n`);
      console.log(loaded.gold.paragraphText);
      console.log('\n한두 문장이어도 괜찮습니다. 이 문단에서 이해한 내용을 자유롭게 적어 주세요.');
      console.log('필요한 경우 후속 질문을 최대 3회 드립니다.');
      console.log('중단하려면 quit 또는 q를 입력하세요.');

      try {
        let answer = await terminal.question('\n> ');
        if (wantsToQuit(answer)) {
          engine.abort();
          console.log('\n실험을 중단했습니다.');
          return;
        }

        let step = await engine.submitInitial(answer);
        for (;;) {
          console.log(`\n${formatStudentStep(step)}`);
          if (options.debug) {
            console.log(`\n${formatDebugEvaluation({ evaluation: step.evaluation, call: step.call })}`);
          }
          if (step.terminal) break;

          answer = await terminal.question('\n답변 > ');
          if (wantsToQuit(answer)) {
            engine.abort();
            console.log('\n실험을 중단했습니다.');
            return;
          }
          step = await engine.submitFollowUp(answer);
        }
      } catch (error) {
        engine.abort();
        console.error('\n평가 결과를 안전하게 처리하지 못해 세션을 종료했습니다. 응답 내용은 판정하지 않았습니다.');
        if (options.debug) console.error(error);
        process.exitCode = 1;
        return;
      }
    }

    if (paragraphIds.length > 1) console.log(`\n전체 ${paragraphIds.length}개 문단 실험을 마쳤습니다.`);
  } finally {
    terminal.close();
  }
}
