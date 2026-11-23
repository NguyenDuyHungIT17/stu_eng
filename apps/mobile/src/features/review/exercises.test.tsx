import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChooseMeaningExercise, FlipExercise, ListenChooseExercise } from './exercises';
import type { Phrase } from './repository';

const p = (id: string, text: string, meaningVi: string): Phrase => ({
  id,
  topicId: 't',
  text,
  ipa: '/x/',
  meaningVi,
  example: null,
  register: 'neutral',
  level: 'A1',
  sortOrder: 0,
  isCustom: false,
  deletedAt: null,
});
const target = p('a', 'Nice to meet you.', 'Rất vui được gặp bạn.');
const options = [p('b', 'Goodbye.', 'Tạm biệt.'), target, p('c', 'Thanks.', 'Cảm ơn.')];

describe('FlipExercise', () => {
  it('ẩn nghĩa đến khi lật, rồi chấm mức nhớ', async () => {
    const onRate = jest.fn();
    await render(
      <FlipExercise phrase={target} isNew={false} onSpeak={jest.fn()} onRate={onRate} />,
    );
    expect(screen.queryByText('Rất vui được gặp bạn.')).toBeNull();
    await fireEvent.press(screen.getByText('Lật thẻ'));
    expect(screen.getByText('Rất vui được gặp bạn.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Dễ'));
    expect(onRate).toHaveBeenCalledWith(4);
  });

  it('cụm mới hiện nghĩa ngay', async () => {
    await render(<FlipExercise phrase={target} isNew onSpeak={jest.fn()} onRate={jest.fn()} />);
    expect(screen.getByText('Rất vui được gặp bạn.')).toBeTruthy();
  });

  it('nút nghe gọi TTS với đúng câu', async () => {
    const onSpeak = jest.fn();
    await render(<FlipExercise phrase={target} isNew onSpeak={onSpeak} onRate={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText('Nghe phát âm: Nice to meet you.'));
    expect(onSpeak).toHaveBeenCalledWith('Nice to meet you.');
  });
});

describe('ChooseMeaningExercise', () => {
  it('chọn đúng: mặc định chấm Được', async () => {
    const onRate = jest.fn();
    await render(
      <ChooseMeaningExercise
        phrase={target}
        options={options}
        onSpeak={jest.fn()}
        onRate={onRate}
      />,
    );
    await fireEvent.press(screen.getByText('Rất vui được gặp bạn.'));
    expect(screen.getByText('Chính xác!')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tiếp tục (Được)'));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('chọn sai: mặc định Quên, nhưng cho sửa mức chấm', async () => {
    const onRate = jest.fn();
    await render(
      <ChooseMeaningExercise
        phrase={target}
        options={options}
        onSpeak={jest.fn()}
        onRate={onRate}
      />,
    );
    await fireEvent.press(screen.getByText('Tạm biệt.'));
    expect(screen.getByText('Chưa đúng')).toBeTruthy();
    expect(screen.getByText('Tiếp tục (Quên)')).toBeTruthy();
    await fireEvent.press(screen.getByText('Khó'));
    expect(onRate).toHaveBeenCalledWith(2);
  });
});

describe('ListenChooseExercise', () => {
  it('tự đọc cụm khi mở, đáp án là chữ tiếng Anh', async () => {
    const onSpeak = jest.fn();
    const onRate = jest.fn();
    await render(
      <ListenChooseExercise phrase={target} options={options} onSpeak={onSpeak} onRate={onRate} />,
    );
    expect(onSpeak).toHaveBeenCalledWith('Nice to meet you.');
    await fireEvent.press(screen.getByText('Nice to meet you.'));
    await fireEvent.press(screen.getByText('Tiếp tục (Được)'));
    expect(onRate).toHaveBeenCalledWith(3);
  });
});
