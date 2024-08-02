// 冒泡排序
function bubbleSort2(arr: number[]): number[] {
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

const arr = [1, 4, 2, 3, 5];
console.log(bubbleSort2(arr));

export default bubbleSort2;
