import { DemoScreen } from "../components/screens/DemoScreen";
import styles from "../app/mvp.module.css";

export function GameRoute({ onHome, onExercise, onNewGame }: { onHome: () => void; onExercise: () => void; onNewGame: () => void }) {
  return <main className={styles.gameRoute}>
    <div className={styles.gameTopbar}><button onClick={onHome} aria-label="ホームへ戻る">閉じる</button><strong>すわぷよ</strong><span>音声</span></div>
    <div className={styles.gameCore}><DemoScreen mvpEmbedded /></div>
    <div className={styles.gameActions}><button onClick={onExercise}>体操タイム</button><button onClick={onNewGame}>新しいゲーム</button></div>
  </main>;
}
