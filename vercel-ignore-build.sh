#!/bin/bash
# Vercel "Ignored Build Step": exit 0 = BỎ QUA build, exit 1 = build.
# Chỉ bỏ qua khi chắc chắn lượt push chỉ đổi tài liệu/kiểm thử; mọi trường hợp khác (không thấy commit trước do clone nông, lỗi git…) đều build.
prev="$VERCEL_GIT_PREVIOUS_SHA"
[ -n "$prev" ] || exit 1
git cat-file -e "$prev^{commit}" 2>/dev/null || exit 1
if git diff --quiet "$prev" HEAD -- . ':(exclude)*.md' ':(exclude)docs/**' ':(exclude)tests/**' ':(exclude).claude/**'; then
  echo "Chỉ đổi tài liệu — bỏ qua build"; exit 0
fi
exit 1
