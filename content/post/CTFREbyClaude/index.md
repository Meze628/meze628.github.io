---
title: "汇编与逆向教程 by Claude Opus4.6"
description: "CTFREbyClaude"
date: 2026-07-30T12:39:00+08:00
math: true
_build:
  list: never
  render: always
---


# 汇编语言与逆向工程完全指南（面向 CTF Reverse）

> **前置假设**：你有 C++ / 信息竞赛基础，熟悉变量、指针、函数调用、递归等概念。     
> **目标架构**：x86-64（也称 amd64），这是 CTF RE 中 **最常见** 的架构。     
> **工具链**：IDA Pro / Ghidra（反编译器），GDB / x64dbg（调试器），objdump / readelf（ELF 分析）

---

## 目录

1. [为什么是 x86 而不是 RISC-V？](#1-为什么是-x86-而不是-risc-v)
2. [从本质理解汇编：它到底是什么？](#2-从本质理解汇编它到底是什么)
3. [x86-64 寄存器体系](#3-x86-64-寄存器体系)
4. [内存模型与寻址方式](#4-内存模型与寻址方式)
5. [核心指令集详解](#5-核心指令集详解)
6. [标志位与条件跳转](#6-标志位与条件跳转)
7. [栈（Stack）的本质](#7-栈stack的本质)
8. [函数调用约定（Calling Convention）](#8-函数调用约定calling-convention)
9. [指针的本质与汇编表示](#9-指针的本质与汇编表示)
10. [C/C++ 结构在汇编中的样子](#10-cc-结构在汇编中的样子)
11. [CTF RE 实战知识](#11-ctf-re-实战知识)
12. [学习路线与建议](#12-学习路线与建议)
13. [字节序（Endianness）](#13-字节序endianness-为什么内存看起来是反的)
14. [`setcc` 指令](#14-setcc-指令--把比较结果存为-0-或-1)
15. [RIP 相对寻址](#15-rip-相对寻址--全局变量与常量)
16. [符号扩展与零扩展深入](#16-符号扩展与零扩展--深入理解)
17. [完整逆向实例分析](#17-完整逆向实例分析--从汇编还原-c-代码)
18. [编译优化对逆向的影响](#18-编译优化对逆向的影响)
19. [C++ 逆向的额外复杂度](#19-c-逆向的额外复杂度)
20. [CTF RE 做题标准流程](#20-ctf-re-做题标准流程10-步)
21. [常见误区](#21-常见误区)
22. [教材取舍建议](#22-教材取舍建议)
23. [编译器驱动学习法](#23-编译器驱动学习法--推荐练习)

---

## 1. 为什么是 x86 而不是 RISC-V？

你那本书讲的是 RISC-V，它是一种 **RISC（精简指令集）** 架构，设计优雅、指令格式统一，非常适合**学术教学**。但 CTF 逆向工程中：

| 场景 | 最常见架构 |
|------|-----------|
| Linux pwn / RE 题目 | **x86-64 (amd64)** |
| Windows 逆向 | **x86-64 / x86-32** |
| 移动端逆向 | ARM / AArch64 |
| IoT / 嵌入式 | MIPS / ARM |

**x86-64 占 CTF RE 题目的 80% 以上**。RISC-V 题目偶尔出现，但很少。

### RISC vs CISC —— 本质区别

| 特性 | RISC (RISC-V, ARM) | CISC (x86) |
|------|-------------------|------------|
| 指令长度 | 固定（通常 4 字节） | **可变**（1~15 字节） |
| 指令数量 | 少，每条指令做的事简单 | 多，一条指令能做很复杂的事 |
| 访存模型 | Load/Store 架构（只有 load/store 能访存） | **任意指令都可以直接操作内存** |
| 寄存器数量 | 多（RISC-V 有 32 个通用寄存器） | 少（x86-64 有 16 个通用寄存器） |
| 设计哲学 | 简洁优雅 | 历史包袱重，但性能极强 |

> **关键理解**：汇编的本质是一样的——都是在操作 **寄存器、内存、控制流**。学会了 x86，RISC-V、ARM 看一下文档就能上手。

---

## 2. 从本质理解汇编：它到底是什么？

### 2.1 抽象层次

```
你写的 C++ 代码
    ↓ 编译器 (g++, clang++)
汇编代码 (.s 文件)        ← 你现在要学的层
    ↓ 汇编器 (as, nasm)
机器码 (.o 文件)           ← CPU 实际执行的二进制
    ↓ 链接器 (ld)
可执行文件 (ELF / PE)
```

**汇编语言 = 机器码的人类可读形式**。每一条汇编指令都 **一一对应** 一条（或几条）机器指令。

### 2.2 冯·诺依曼架构的核心

CPU 做的事情本质上只有三件：

1. **从内存取指令**（Fetch）
2. **解码指令**（Decode）
3. **执行指令**（Execute）

不断循环。就这么简单。

### 2.3 两种汇编语法

x86 汇编有两种语法风格，你 **必须** 都能看懂：

```asm
; ========== Intel 语法（IDA、Windows 常用）==========
; 格式：操作码  目的操作数, 源操作数
mov     rax, rbx        ; rax = rbx
add     rax, 10         ; rax = rax + 10
mov     rax, [rbx]      ; rax = *rbx（从 rbx 指向的内存读取）
mov     [rbx], rax      ; *rbx = rax（写入 rbx 指向的内存）

; ========== AT&T 语法（GDB、GCC 默认）==========
; 格式：操作码  源操作数, 目的操作数（注意方向相反！）
; 寄存器前加 %，立即数前加 $，操作码有大小后缀（b/w/l/q）
movq    %rbx, %rax      ; rax = rbx
addq    $10, %rax       ; rax = rax + 10
movq    (%rbx), %rax    ; rax = *rbx
movq    %rax, (%rbx)    ; *rbx = rax
```

> **建议**：优先学 **Intel 语法**，因为 IDA Pro 和 Ghidra 默认都是 Intel 语法。GDB 中可以用 `set disassembly-flavor intel` 切换。

**本文后续全部使用 Intel 语法。**

---

## 3. x86-64 寄存器体系

### 3.1 通用寄存器

x86-64 有 **16 个 64 位通用寄存器**。每个寄存器可以按不同大小访问：

```
┌─────────────────────────────────────────────────── 64 bit ──┐
│                            RAX                               │
│                    ┌─────── 32 bit ───┐                      │
│                    │       EAX        │                      │
│                    │    ┌── 16 bit ─┐ │                      │
│                    │    │    AX     │ │                      │
│                    │    │  AH │ AL  │ │                      │
└────────────────────┴────┴────┴─────┴─┘
```

| 64 位 | 32 位 | 16 位 | 8 位低 | 8 位高 | 传统用途 |
|-------|-------|-------|--------|--------|---------|
| `RAX` | `EAX` | `AX` | `AL` | `AH` | **累加器**，函数返回值 |
| `RBX` | `EBX` | `BX` | `BL` | `BH` | **基址**寄存器（callee-saved） |
| `RCX` | `ECX` | `CX` | `CL` | `CH` | **计数器**（循环、第 4 个参数） |
| `RDX` | `EDX` | `DX` | `DL` | `DH` | **数据**（第 3 个参数） |
| `RSI` | `ESI` | `SI` | `SIL` | - | **源**索引（第 2 个参数） |
| `RDI` | `EDI` | `DI` | `DIL` | - | **目的**索引（第 1 个参数） |
| `RBP` | `EBP` | `BP` | `BPL` | - | **栈帧基指针** |
| `RSP` | `ESP` | `SP` | `SPL` | - | **栈指针**（永远指向栈顶） |
| `R8`  | `R8D` | `R8W` | `R8B` | - | 第 5 个参数 |
| `R9`  | `R9D` | `R9W` | `R9B` | - | 第 6 个参数 |
| `R10`~`R15` | `R10D`~`R15D` | ... | ... | - | 通用 |

### 3.2 特殊寄存器

| 寄存器 | 作用 |
|--------|------|
| `RIP` | **指令指针**（Instruction Pointer），指向当前正在执行的指令地址。**你不能直接 mov 赋值**，只能通过 jmp/call/ret 间接修改 |
| `RFLAGS` | **标志寄存器**，存储运算结果的状态（零标志、进位标志、符号标志等） |
| `RSP` | **栈指针**，永远指向当前栈顶 |
| `RBP` | **帧指针**，指向当前栈帧的底部 |

### 3.3 一个重要的坑：32 位操作会清零高 32 位

```asm
; 假设 RAX = 0xFFFFFFFF_12345678
mov     eax, 1
; 执行后 RAX = 0x00000000_00000001 （高 32 位被清零了！）
; 这是 x86-64 的规定，不是 bug

; 但 8 位和 16 位操作不会清零高位：
mov     al, 1
; 只修改 RAX 的最低 8 位，其余不变
```

---

## 4. 内存模型与寻址方式

### 4.1 进程的虚拟内存布局

```
高地址 0x7FFF_FFFF_FFFF
┌──────────────────────┐
│        内核空间        │  用户不可访问
├──────────────────────┤
│         栈 (Stack)    │  ↓ 向低地址增长
│          ...          │
│          ↓            │
│                       │
│          ↑            │
│          ...          │
│         堆 (Heap)     │  ↑ 向高地址增长
├──────────────────────┤
│        BSS 段         │  未初始化的全局变量（自动置零）
├──────────────────────┤
│       Data 段         │  已初始化的全局变量
├──────────────────────┤
│       Text 段         │  代码（机器指令）——只读、可执行
├──────────────────────┤
低地址 0x0000_0000_0000
```

> **CTF 关键**：栈向低地址增长！`push` 会让 RSP 变小，`pop` 会让 RSP 变大。

### 4.2 x86-64 寻址方式

x86 的强大（也是复杂）之处在于它的寻址方式极其灵活：

```asm
; 1. 立即数寻址（Immediate）
mov     rax, 42                 ; rax = 42

; 2. 寄存器寻址（Register）
mov     rax, rbx                ; rax = rbx

; 3. 直接内存寻址（Direct / Absolute）
mov     rax, [0x601040]         ; rax = *(int64_t*)0x601040
                                ;（从地址 0x601040 读取 8 字节）

; 4. 寄存器间接寻址（Register Indirect）
mov     rax, [rbx]              ; rax = *(int64_t*)rbx
                                ;（把 rbx 当作指针，读取它指向的内存）

; 5. 基址 + 偏移（Base + Displacement）
mov     rax, [rbx + 8]          ; rax = *(int64_t*)(rbx + 8)
                                ;（常用于结构体成员访问）

; 6. 基址 + 变址 * 缩放 + 偏移（最完整的形式）
; 通用公式：[base + index * scale + displacement]
;   base:         任意通用寄存器
;   index:        任意通用寄存器（除 RSP）
;   scale:        1, 2, 4, 8（对应 byte, short, int, long 数组）
;   displacement: 立即数常量

mov     rax, [rbx + rcx*4 + 0x10]
; 等价于 C：rax = *((int*)(rbx + 0x10) + rcx)
; 或者更精确：rax = *(int64_t*)((char*)rbx + rcx*4 + 0x10)
```

### 4.3 理解 `[...]` 方括号 —— 最关键的记忆点

**方括号 `[]` = 解引用 = C 的 `*` 操作符**

```asm
mov     rax, rbx        ; rax = rbx          （寄存器之间复制值）
mov     rax, [rbx]      ; rax = *rbx         （rbx 是指针，读取指向的内存）
lea     rax, [rbx]      ; rax = &(*rbx) = rbx（只计算地址，不访存）
```

`lea`（Load Effective Address）是一个很特殊的指令：它 **计算方括号里的地址，但不读内存**。编译器经常用它来做快速算术：

```asm
lea     rax, [rbx + rcx*2 + 5]
; 不访问内存！只是计算 rax = rbx + rcx*2 + 5
; 编译器用一条 lea 代替了一个乘法和两个加法
```

### 4.4 数据大小与操作

x86 的指令需要知道操作数的大小。在 Intel 语法中，如果操作数是内存，有时需要显式指定：

```asm
mov     byte  [rax], 0     ; 写入 1 字节  （char）
mov     word  [rax], 0     ; 写入 2 字节  （short）
mov     dword [rax], 0     ; 写入 4 字节  （int）
mov     qword [rax], 0     ; 写入 8 字节  （long / pointer）
```

| 关键字 | 大小 | C 类型 |
|--------|------|--------|
| `byte` | 1 字节 (8 bit) | `char` |
| `word` | 2 字节 (16 bit) | `short` |
| `dword` | 4 字节 (32 bit) | `int` |
| `qword` | 8 字节 (64 bit) | `long` / `pointer` |

---

## 5. 核心指令集详解

### 5.1 数据传送

```asm
mov     dst, src          ; dst = src（最常用的指令）
movzx   rax, byte [rbx]   ; 零扩展（unsigned：高位补 0）
                           ; rax = (uint64_t)(*(uint8_t*)rbx)
movsx   rax, byte [rbx]   ; 符号扩展（signed：高位补符号位）
                           ; rax = (int64_t)(*(int8_t*)rbx)

; movzx vs movsx —— CTF 中经常考！
; 假设内存中有值 0xFF（= -1 作为 signed char，= 255 作为 unsigned char）
movzx   eax, byte [rbx]   ; eax = 0x000000FF = 255
movsx   eax, byte [rbx]   ; eax = 0xFFFFFFFF = -1（高位全填 1）

xchg    rax, rbx          ; 交换 rax 和 rbx 的值

cmovcc  rax, rbx          ; 条件传送（cc = 条件码，见后面章节）
                           ; 如果条件满足：rax = rbx，否则不变
```

### 5.2 算术运算

```asm
add     rax, rbx          ; rax += rbx
sub     rax, rbx          ; rax -= rbx
inc     rax               ; rax++（不影响 CF 进位标志）
dec     rax               ; rax--

; 乘法 —— 比较特殊
imul    rax, rbx          ; rax = rax * rbx（有符号乘法，常用形式）
imul    rax, rbx, 10      ; rax = rbx * 10（三操作数形式）
mul     rbx               ; 无符号乘法：RDX:RAX = RAX * RBX
                           ; 结果 128 位，高 64 位在 RDX，低 64 位在 RAX

; 除法 —— 更特殊，CTF 中常见
; 被除数必须放在 RDX:RAX 中（128 位）
; 所以除法前通常要先 "扩展" RAX
cdq                        ; 将 EAX 符号扩展到 EDX:EAX（32 位除法前用）
cqo                        ; 将 RAX 符号扩展到 RDX:RAX（64 位除法前用）
idiv    rbx               ; RAX = RDX:RAX / RBX（商）
                           ; RDX = RDX:RAX % RBX（余数）
div     rbx               ; 无符号版本，同上

; 取负
neg     rax               ; rax = -rax（二进制补码取反）
```

### 5.3 位运算

```asm
and     rax, rbx          ; rax &= rbx
or      rax, rbx          ; rax |= rbx
xor     rax, rbx          ; rax ^= rbx
not     rax               ; rax = ~rax（按位取反）

; 移位
shl     rax, 3            ; rax <<= 3（逻辑左移 = 乘以 8）
shr     rax, 3            ; rax >>= 3（逻辑右移 = 无符号除以 8）
sar     rax, 3            ; 算术右移（保留符号位 = 有符号除以 8）

; 循环移位
rol     rax, 5            ; 循环左移 5 位
ror     rax, 5            ; 循环右移 5 位

; CTF 经典：xor rax, rax 用于清零（比 mov rax, 0 快且短）
xor     eax, eax          ; rax = 0（只需 2 字节，编译器最爱）

; test 指令 = and 但不保存结果，只设置标志位
test    rax, rax          ; 检查 rax 是否为 0（设置 ZF）
                           ; 等价于 cmp rax, 0 但更高效
```

### 5.4 比较与测试

```asm
cmp     rax, rbx          ; 计算 rax - rbx，但不保存结果
                           ; 只设置 RFLAGS 标志位，供后续条件跳转使用

test    rax, rbx          ; 计算 rax & rbx，但不保存结果
                           ; 常见用法：test rax, rax（检查是否为 0）
```

### 5.5 控制流

```asm
; 无条件跳转
jmp     label             ; goto label（修改 RIP）

; 条件跳转（根据 RFLAGS 中的标志位决定是否跳转）
; 通常紧跟在 cmp 或 test 之后
je      label             ; Jump if Equal（ZF=1，即 cmp 结果相等）
jne     label             ; Jump if Not Equal（ZF=0）
jg      label             ; Jump if Greater（有符号 >）
jge     label             ; Jump if Greater or Equal（有符号 >=）
jl      label             ; Jump if Less（有符号 <）
jle     label             ; Jump if Less or Equal（有符号 <=）
ja      label             ; Jump if Above（无符号 >）
jae     label             ; Jump if Above or Equal（无符号 >=）
jb      label             ; Jump if Below（无符号 <）
jbe     label             ; Jump if Below or Equal（无符号 <=）
js      label             ; Jump if Sign（负数）
jns     label             ; Jump if Not Sign（非负数）
jz      label             ; = je（Zero Flag 为 1）
jnz     label             ; = jne（Zero Flag 为 0）

; 函数调用与返回
call    func              ; 1. push RIP（返回地址入栈）
                           ; 2. jmp func

ret                       ; 1. pop RIP（从栈顶取出返回地址）
                           ; 2. jmp 到那个地址
                           ; 等价于 pop rip（虽然不能真的这么写）

; 特殊
nop                       ; 什么都不做（No Operation）
                           ; 常用于填充或 NOP sled
int     0x80              ; 触发中断（32 位 Linux 系统调用）
syscall                   ; 64 位 Linux 系统调用
```

---

## 6. 标志位与条件跳转

### 6.1 RFLAGS 寄存器中的关键标志位

执行 `cmp rax, rbx`（本质是 `rax - rbx`）后：

| 标志位 | 名称 | 含义 | 何时置 1 |
|--------|------|------|---------|
| **ZF** | Zero Flag | 结果是否为 0 | `rax == rbx` |
| **SF** | Sign Flag | 结果是否为负 | 结果的最高位为 1 |
| **CF** | Carry Flag | 是否产生无符号溢出/借位 | 无符号减法借位 |
| **OF** | Overflow Flag | 是否产生有符号溢出 | 有符号运算溢出 |

### 6.2 条件跳转的完整对照表

| 指令 | 条件 | 标志位条件 | C 等价（cmp a, b 后） |
|------|------|-----------|---------------------|
| `je` / `jz` | Equal / Zero | ZF=1 | `a == b` |
| `jne` / `jnz` | Not Equal | ZF=0 | `a != b` |
| `jg` / `jnle` | Greater (signed) | ZF=0 且 SF=OF | `(signed)a > (signed)b` |
| `jge` / `jnl` | Greater or Equal (signed) | SF=OF | `(signed)a >= (signed)b` |
| `jl` / `jnge` | Less (signed) | SF≠OF | `(signed)a < (signed)b` |
| `jle` / `jng` | Less or Equal (signed) | ZF=1 或 SF≠OF | `(signed)a <= (signed)b` |
| `ja` / `jnbe` | Above (unsigned) | CF=0 且 ZF=0 | `(unsigned)a > (unsigned)b` |
| `jae` / `jnb` | Above or Equal (unsigned) | CF=0 | `(unsigned)a >= (unsigned)b` |
| `jb` / `jnae` | Below (unsigned) | CF=1 | `(unsigned)a < (unsigned)b` |
| `jbe` / `jna` | Below or Equal (unsigned) | CF=1 或 ZF=1 | `(unsigned)a <= (unsigned)b` |

> **CTF 关键**：`jg/jl` 是 **有符号** 比较，`ja/jb` 是 **无符号** 比较。搞混了就会误判逻辑！

---

## 7. 栈（Stack）的本质

### 7.1 栈是什么？

栈就是一段内存区域，用 RSP 寄存器标记"栈顶"位置。**栈从高地址向低地址增长**。

```
高地址
┌─────────────────────┐
│     之前的栈内容      │
├─────────────────────┤ ← RBP（当前栈帧底部）
│   saved RBP         │  ← 上一个函数的 RBP
├─────────────────────┤
│   局部变量           │
│   ...                │
├─────────────────────┤ ← RSP（栈顶，向下增长）
│                     │
│   （可用空间）        │
│                     │
低地址
```

### 7.2 Push 和 Pop

```asm
push    rax
; 等价于：
;   sub     rsp, 8       ; 栈顶下移 8 字节
;   mov     [rsp], rax   ; 把 rax 的值存到新栈顶

pop     rax
; 等价于：
;   mov     rax, [rsp]   ; 从栈顶读取值到 rax
;   add     rsp, 8       ; 栈顶上移 8 字节
```

### 7.3 函数栈帧（Stack Frame）

当函数被调用时，栈上会形成一个 **栈帧**：

```
高地址
┌─────────────────────┐
│   调用者的栈帧        │
├─────────────────────┤
│   参数 7, 8, ...     │  ← 超过 6 个参数时通过栈传递
├─────────────────────┤
│   返回地址            │  ← call 指令自动 push 的 RIP
├─────────────────────┤ ← 进入函数时的 RSP
│   saved RBP         │  ← push rbp 保存的旧 RBP
├─────────────────────┤ ← RBP（mov rbp, rsp 后）
│   局部变量 1          │  ← [rbp - 8]
│   局部变量 2          │  ← [rbp - 16]
│   局部变量 3          │  ← [rbp - 24]
│   ...                │
├─────────────────────┤ ← RSP（sub rsp, N 后）
低地址
```

### 7.4 函数序言与尾声（Prologue & Epilogue）

```asm
; ===== 函数序言（Prologue）=====
push    rbp              ; 保存调用者的栈帧基址
mov     rbp, rsp         ; 建立当前函数的栈帧
sub     rsp, 0x20        ; 为局部变量分配 32 字节空间

; ===== 函数体 =====
; 使用 [rbp - 8], [rbp - 16] 等访问局部变量
; 使用 [rbp + 16], [rbp + 24] 等访问栈上的参数

; ===== 函数尾声（Epilogue）=====
; 方式 1：经典
mov     rsp, rbp         ; 恢复栈指针
pop     rbp              ; 恢复调用者的 RBP
ret                      ; 返回

; 方式 2：leave 指令（等价于上面两行）
leave                    ; = mov rsp, rbp + pop rbp
ret
```

> **优化编译下的注意点**：编译器可能省略 RBP 栈帧指针（`-fomit-frame-pointer`），直接用 RSP 偏移来访问变量。这时你在 IDA 里看到的是 `[rsp + 0x10]` 而不是 `[rbp - 0x10]`。

---

## 8. 函数调用约定（Calling Convention）

### 8.1 System V AMD64 ABI（Linux / macOS）

这是 CTF 中 **最常见** 的调用约定：

| 项目 | 规则 |
|------|------|
| 前 6 个整数/指针参数 | **RDI, RSI, RDX, RCX, R8, R9**（按顺序） |
| 前 8 个浮点参数 | XMM0 ~ XMM7 |
| 更多参数 | 通过栈传递（从右往左 push） |
| 返回值 | **RAX**（整数/指针），XMM0（浮点） |
| 128 位返回值 | RAX（低 64 位）+ RDX（高 64 位） |
| Caller-saved（调用者保存） | RAX, RCX, RDX, RSI, RDI, R8~R11 |
| Callee-saved（被调用者保存） | **RBX, RBP, R12~R15** |
| 栈对齐 | 调用 `call` 前 RSP 必须 16 字节对齐 |

**示例：`printf("Hello %s, you are %d\n", name, age);`**

```asm
; 3 个参数：
;   arg1 (RDI) = 格式串地址
;   arg2 (RSI) = name 指针
;   arg3 (RDX) = age 整数值
lea     rdi, [rel format_str]   ; 第 1 个参数：格式串
mov     rsi, [rel name_ptr]     ; 第 2 个参数：name
mov     edx, [rel age]          ; 第 3 个参数：age
xor     eax, eax                ; AL = 0（printf 的变参约定：浮点参数个数）
call    printf
```

### 8.2 Microsoft x64 ABI（Windows）

| 项目 | 规则 |
|------|------|
| 前 4 个整数/指针参数 | **RCX, RDX, R8, R9** |
| 更多参数 | 栈传递 |
| 返回值 | RAX |
| Shadow Space | 调用前必须在栈上预留 32 字节（4 × 8），即使参数少于 4 个 |
| Callee-saved | RBX, RBP, RDI, RSI, R12~R15 |

> **CTF 关键**：看到参数放在 RCX/RDX 还是 RDI/RSI，就能判断是 Windows 还是 Linux 编译的。

### 8.3 Caller-saved vs Callee-saved 详解

```c
// 假设有这样的 C 代码：
int outer() {
    int x = compute_something();   // x 存在某个寄存器里
    inner();                       // 调用另一个函数
    return x + 1;                  // 这里还需要用到 x！
}
```

如果 `x` 存在 caller-saved 寄存器（如 RAX）里，调用 `inner()` 后 RAX 可能被覆盖。
所以编译器会选择把 `x` 放在 callee-saved 寄存器（如 RBX）里，因为 `inner()` 必须保证 RBX 的值不变。

```asm
outer:
    push    rbx                  ; 保存 RBX（callee-saved 义务）
    call    compute_something
    mov     ebx, eax             ; 把返回值存到 RBX（callee-saved，跨调用安全）
    call    inner                ; inner 可能会改 RAX, RCX 等，但不会改 RBX
    lea     eax, [rbx + 1]      ; x + 1 作为返回值
    pop     rbx                  ; 恢复 RBX
    ret
```

---

## 9. 指针的本质与汇编表示

### 9.1 指针到底是什么？

**指针 = 一个整数值，它是某个内存地址。** 在 x86-64 中，指针就是 8 字节（64 位）整数。

在汇编层面，**指针和普通整数没有任何区别**。都是 64 位数字。是你（程序员/编译器）赋予它"这是个地址"的语义。

```c
int x = 42;        // x 是一个值
int *p = &x;       // p 是一个指针（存的是 x 的内存地址）
int y = *p;         // 解引用：通过地址读取值
```

等价汇编：

```asm
; 假设 x 在 [rbp - 4]，p 在 [rbp - 16]，y 在 [rbp - 8]

; int x = 42;
mov     dword [rbp - 4], 42        ; 在栈上存 42

; int *p = &x;
lea     rax, [rbp - 4]             ; rax = rbp - 4（x 的地址）
mov     [rbp - 16], rax            ; p = rax（把地址存到 p）

; int y = *p;
mov     rax, [rbp - 16]            ; rax = p（取出指针值）
mov     eax, [rax]                 ; eax = *p（解引用：读取指针指向的值）
mov     [rbp - 8], eax             ; y = eax
```

### 9.2 数组与指针算术

```c
int arr[5] = {10, 20, 30, 40, 50};
int val = arr[3];       // 等价于 *(arr + 3)
```

```asm
; arr 在栈上 [rbp - 20] 到 [rbp - 4]（5 个 int = 20 字节）
; arr[0] = [rbp - 20], arr[1] = [rbp - 16], ..., arr[3] = [rbp - 8]

; int val = arr[3];
; 编译器直接计算偏移：
mov     eax, [rbp - 8]             ; 直接用编译期常量偏移

; 如果索引是变量（运行时确定）：
; int idx = 3;
; int val = arr[idx];
mov     ecx, [rbp - 24]            ; ecx = idx
mov     eax, [rbp - 20 + rcx*4]   ; eax = arr[idx]
; 注意 *4 是因为 sizeof(int) = 4
```

**指针算术的本质**：

```c
int *p = arr;
p += 3;       // p 向前移动 3 个 int = 12 字节
```

```asm
lea     rax, [rbp - 20]        ; rax = &arr[0]
add     rax, 12                ; rax += 3 * sizeof(int) = 12
; 现在 rax 指向 arr[3]
```

> **核心理解**：C 中 `p + n` 的真实含义是 `(char*)p + n * sizeof(*p)`。编译器根据指针类型自动乘以元素大小。但在汇编里，你看到的是原始的字节偏移。

### 9.3 多级指针

```c
int x = 42;
int *p = &x;
int **pp = &p;
int y = **pp;
```

```asm
; x 在 [rbp - 4], p 在 [rbp - 16], pp 在 [rbp - 24]

; int *p = &x;
lea     rax, [rbp - 4]
mov     [rbp - 16], rax

; int **pp = &p;
lea     rax, [rbp - 16]
mov     [rbp - 24], rax

; int y = **pp;
mov     rax, [rbp - 24]    ; rax = pp（取出二级指针的值 = p 的地址）
mov     rax, [rax]          ; rax = *pp = p（取出一级指针的值 = x 的地址）
mov     eax, [rax]          ; eax = *p = x = 42（取出 x 的值）
```

### 9.4 结构体指针

```c
struct Player {
    int hp;         // 偏移 0
    int mp;         // 偏移 4
    char name[16];  // 偏移 8
    int level;      // 偏移 24
};

struct Player *p = get_player();
int hp = p->hp;
int lvl = p->level;
```

```asm
call    get_player
; RAX = 返回的 Player* 指针

mov     edx, [rax]          ; edx = p->hp    (偏移 +0)
mov     ecx, [rax + 4]      ; ecx = p->mp    (偏移 +4)
mov     esi, [rax + 24]     ; esi = p->level  (偏移 +24)
```

> **逆向技巧**：当你看到 `mov eax, [rbx + 0x18]` 之类的代码，就知道 rbx 是一个结构体指针，0x18 是某个成员的偏移。通过多个偏移可以逆向出结构体的布局。

### 9.5 函数指针

```c
typedef int (*func_ptr)(int, int);
func_ptr f = &add;
int result = f(3, 5);
```

```asm
; 函数指针就是一个地址值
lea     rax, [rel add]     ; rax = add 函数的地址
mov     [rbp - 8], rax     ; f = rax

; 通过函数指针调用
mov     rax, [rbp - 8]     ; rax = f
mov     edi, 3             ; 第 1 个参数
mov     esi, 5             ; 第 2 个参数
call    rax                ; 调用 f(3, 5)
; call 寄存器 = 间接调用，通过函数指针
```

> **CTF 关键**：`call rax` 或 `call [rax]` 是间接调用，常见于虚表（vtable）调用、函数指针数组、被混淆的代码。

### 9.6 字符串与指针

C 的字符串就是 `char*`，以 `\0` 结尾：

```c
// "Hello" 在内存中：48 65 6C 6C 6F 00
char *s = "Hello";
char c = s[2];      // 'l' = 0x6C
int len = strlen(s); // 5
```

```asm
; 手写 strlen 的汇编（逆向中常见的模式）：
; RDI = 字符串指针
strlen_manual:
    xor     ecx, ecx            ; ecx = 0（计数器）
.loop:
    cmp     byte [rdi + rcx], 0  ; 检查当前字符是否为 '\0'
    je      .done
    inc     ecx                  ; 计数器++
    jmp     .loop
.done:
    mov     eax, ecx             ; 返回长度
    ret
```

### 9.7 常见指针陷阱（CTF 中常考）

```c
// 1. 空指针解引用
int *p = NULL;  // p = 0
*p = 42;        // SIGSEGV（段错误）

// 2. 悬垂指针（Dangling Pointer）
int *p = malloc(sizeof(int));
free(p);
*p = 42;        // Use After Free（UAF）—— pwn 题常见漏洞！

// 3. 缓冲区溢出
char buf[8];
strcpy(buf, "AAAAAAAAAAAAAAAA");  // 溢出！覆盖返回地址！

// 4. 类型混淆（Type Confusion）
void *generic = malloc(100);
int *ip = (int*)generic;
float *fp = (float*)generic;
// 同一块内存被当成不同类型解释
```

---

## 10. C/C++ 结构在汇编中的样子

### 10.1 if-else

```c
if (x > 10) {
    a = 1;
} else {
    a = 2;
}
```

```asm
    cmp     dword [rbp - 4], 10     ; x > 10?
    jle     .else_branch            ; 如果 x <= 10，跳到 else
    ; if 分支：
    mov     dword [rbp - 8], 1      ; a = 1
    jmp     .end_if
.else_branch:
    mov     dword [rbp - 8], 2      ; a = 2
.end_if:
```

> **逆向技巧**：编译器通常会 **取反条件** 来跳到 else 分支。`if (x > 10)` 变成 `jle .else`。

### 10.2 for 循环

```c
int sum = 0;
for (int i = 0; i < 10; i++) {
    sum += arr[i];
}
```

```asm
    xor     eax, eax            ; sum = 0
    xor     ecx, ecx            ; i = 0
.loop_start:
    cmp     ecx, 10             ; i < 10?
    jge     .loop_end           ; 如果 i >= 10，退出循环
    add     eax, [rbx + rcx*4]  ; sum += arr[i]
    inc     ecx                 ; i++
    jmp     .loop_start
.loop_end:
```

### 10.3 while 循环

```c
while (x != 0) {
    x = process(x);
}
```

```asm
.while_check:
    test    edi, edi            ; x == 0?
    jz      .while_end          ; 如果 x == 0，退出
    call    process             ; x = process(x)
    mov     edi, eax            ; 把返回值作为下一次的参数
    jmp     .while_check
.while_end:
```

### 10.4 switch-case

```c
switch (x) {
    case 0: do_zero(); break;
    case 1: do_one(); break;
    case 2: do_two(); break;
    default: do_default(); break;
}
```

编译器可能生成 **跳转表（Jump Table）**：

```asm
    cmp     eax, 2              ; x <= 2?
    ja      .default            ; 无符号大于 2 → default
    ; 跳转表
    lea     rcx, [rel .jump_table]
    movsxd  rdx, dword [rcx + rax*4]    ; 读取偏移
    add     rdx, rcx            ; 计算目标地址
    jmp     rdx                 ; 跳转

.jump_table:
    dd      .case0 - .jump_table
    dd      .case1 - .jump_table
    dd      .case2 - .jump_table

.case0: call do_zero;  jmp .end_switch
.case1: call do_one;   jmp .end_switch
.case2: call do_two;   jmp .end_switch
.default: call do_default
.end_switch:
```

> **逆向技巧**：在 IDA 中看到 `jmp [reg + rax*4 + ...]` 基本就是 switch 的跳转表。

### 10.5 C++ 虚函数调用

```cpp
class Animal {
public:
    virtual void speak() = 0;
    virtual void eat() = 0;
};

Animal *a = new Dog();
a->speak();     // 虚函数调用
```

```asm
; a 在 rax 中
; 每个有虚函数的对象，开头 8 字节是 vtable 指针

mov     rdi, rax             ; this 指针作为第一个参数
mov     rcx, [rax]           ; rcx = vtable 指针（对象的前 8 字节）
call    [rcx]                ; 调用 vtable[0] = speak()
; 如果调用 eat()：
; call  [rcx + 8]            ; vtable[1] = eat()
```

```
对象内存布局：
┌──────────────┐
│  vtable_ptr  │ → ┌─────────────────┐
├──────────────┤   │ &Dog::speak     │  vtable[0]
│  成员变量...  │   │ &Dog::eat       │  vtable[1]
└──────────────┘   └─────────────────┘
```

---

## 11. CTF RE 实战知识

### 11.1 常见的反逆向技巧

| 技巧 | 汇编特征 | 对策 |
|------|---------|------|
| **字符串混淆** | 看不到明文字符串，运行时动态解密 | 动态调试，在解密后下断点 |
| **控制流平坦化** | 一个大 switch 控制所有基本块 | 符号执行（angr），或手动分析 |
| **花指令（Junk Code）** | 无意义的指令序列 | NOP 掉或忽略 |
| **反调试** | `ptrace`、`IsDebuggerPresent`、时间检测 | patch 掉检查或修改返回值 |
| **自修改代码（SMC）** | 运行时修改 .text 段 | 动态调试观察修改后的代码 |
| **虚拟机保护（VM Protect）** | 自定义字节码 + 解释器循环 | 分析 handler 表，理解虚拟指令集 |

### 11.2 识别常见函数

在逆向中，即使被 strip 掉了符号，也能通过特征识别函数：

```asm
; ===== strlen 特征 =====
; 单字节比较 + 循环 + 检测 0
.loop:
    cmp     byte [rdi], 0
    je      .end
    inc     rdi
    jmp     .loop

; ===== memcpy 特征 =====
; rep movsb 或 rep movsq
mov     rcx, rdx        ; 长度
rep     movsb            ; 从 RSI 复制 RCX 字节到 RDI

; ===== strcmp 特征 =====
; 两个指针逐字节比较
.loop:
    mov     al, [rdi]
    cmp     al, [rsi]
    jne     .not_equal
    test    al, al
    jz      .equal
    inc     rdi
    inc     rsi
    jmp     .loop

; ===== XOR 加密/解密 =====
; 经典 CTF 套路
.loop:
    xor     byte [rdi + rcx], KEY
    inc     rcx
    cmp     rcx, LEN
    jl      .loop
```

### 11.3 常见加密算法的汇编特征

| 算法 | 识别特征 |
|------|---------|
| **XOR** | 简单循环 + `xor byte [ptr], key` |
| **Caesar/ROT13** | `add/sub byte, N` 在字母范围内循环 |
| **Base64** | 查表操作，表中有 `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/` |
| **RC4** | 两个 256 字节数组（S-box），KSA + PRGA 两阶段 |
| **AES** | 查找 S-box 常量 `0x63636363`，或 `SubBytes`/`MixColumns` 运算 |
| **TEA/XTEA** | 常量 `0x9E3779B9`（黄金比例），32 轮循环 |
| **MD5** | 常量 `0x67452301`, `0xEFCDAB89`, `0x98BADCFE`, `0x10325476` |
| **SHA-256** | 常量 `0x6A09E667`, `0xBB67AE85`, ... |

> **技巧**：在 IDA 中搜索这些特征常量（`Search → Immediate Value`）可以快速定位加密函数。

### 11.4 CTF RE 常见题型

```
1. 直接逻辑判断
   - 程序读取输入，经过一系列变换，与目标值比较
   - 思路：逆推变换过程

2. 迷宫 / 地图题
   - 二维数组 + 方向控制（WASD）
   - 找到从入口到出口的路径

3. 虚拟机（VM）题
   - 自定义指令集，需要逆向 VM 的 fetch-decode-execute 循环
   - 然后"反汇编"字节码

4. 数学/密码学题
   - RSA、ECC、格密码等
   - 需要数学知识 + z3 / SageMath

5. 动态分析题
   - Anti-Debug、SMC（自修改代码）
   - 需要 patch 或动态调试

6. 混淆/加壳
   - UPX（简单脱壳：upx -d）
   - 复杂壳需要手动 dump + IAT 修复
```

### 11.5 常用工具与命令速查

```bash
# ===== 静态分析 =====
file binary                    # 查看文件类型（ELF? PE?）
strings binary                 # 提取可打印字符串
strings -n 6 binary            # 只显示 >= 6 字符的串
objdump -d binary              # 反汇编
objdump -M intel -d binary     # Intel 语法反汇编
readelf -h binary              # ELF 头信息
readelf -S binary              # Section 表
readelf -l binary              # Program Header（段表）
readelf --syms binary          # 符号表
checksec binary                # 查看保护机制（NX, ASLR, PIE, Canary）

# ===== 动态分析 =====
ltrace ./binary                # 跟踪库函数调用
strace ./binary                # 跟踪系统调用

# ===== GDB 常用命令 =====
gdb ./binary
(gdb) set disassembly-flavor intel    # 切换 Intel 语法
(gdb) b main                          # 在 main 下断点
(gdb) b *0x401234                     # 在指定地址下断点
(gdb) r                               # 运行
(gdb) ni                              # 单步（不进入函数）
(gdb) si                              # 单步（进入函数）
(gdb) c                               # 继续运行
(gdb) info registers                  # 查看所有寄存器
(gdb) x/10gx $rsp                     # 查看栈上 10 个 qword
(gdb) x/s 0x402000                    # 查看字符串
(gdb) x/20i $rip                      # 查看当前位置 20 条指令
(gdb) disas main                      # 反汇编 main 函数
(gdb) p/x $rax                        # 打印 rax（16 进制）
(gdb) set $rax = 0                    # 修改寄存器值
(gdb) set *(int*)0x601040 = 42        # 修改内存值

# ===== GDB + pwndbg/GEF 增强 =====
# 推荐安装 pwndbg 或 GEF，提供更好的 UI
vmmap                          # 查看内存映射
heap                           # 查看堆信息
telescope $rsp 20              # 可视化栈内容
```

### 11.6 用 z3 约束求解（CTF 必备技能）

很多 RE 题的 flag 验证逻辑可以用约束求解器秒杀：

```python
from z3 import *

# 假设 flag 是 8 个字符
flag = [BitVec(f'flag_{i}', 8) for i in range(8)]
s = Solver()

# 添加约束：可打印字符
for c in flag:
    s.add(c >= 0x20, c <= 0x7e)

# 添加从逆向中提取的约束
# 例如：flag[0] ^ 0x37 == 0x55
s.add(flag[0] ^ 0x37 == 0x55)
# flag[1] + flag[2] == 0xCA
s.add(flag[1] + flag[2] == 0xCA)
# ... 更多约束

if s.check() == sat:
    m = s.model()
    result = ''.join(chr(m[c].as_long()) for c in flag)
    print(f"FLAG: {result}")
```

### 11.7 用 angr 符号执行（进阶）

```python
import angr
import claripy

proj = angr.Project('./binary', auto_load_libs=False)

# 创建符号输入
flag_len = 32
flag = claripy.BVS('flag', flag_len * 8)

# 创建初始状态
state = proj.factory.entry_state(stdin=angr.SimFileStream(content=flag))

# 约束为可打印字符
for i in range(flag_len):
    byte = flag.get_byte(i)
    state.solver.add(byte >= 0x20)
    state.solver.add(byte <= 0x7e)

# 探索路径
simgr = proj.factory.simgr(state)
simgr.explore(
    find=0x401234,     # "Correct!" 的地址
    avoid=0x401256     # "Wrong!" 的地址
)

if simgr.found:
    found = simgr.found[0]
    print(found.solver.eval(flag, cast_to=bytes))
```

---

## 12. 学习路线与建议

### 12.1 推荐学习路线

```
第一阶段：基础（1~2 周）
├── 掌握 x86-64 寄存器、常用指令、寻址方式
├── 理解栈帧、函数调用约定
├── 能看懂简单 C 程序的汇编输出
└── 工具：Compiler Explorer (godbolt.org) + GDB

第二阶段：工具链（1 周）
├── 学会使用 IDA Pro 或 Ghidra
├── 学会使用 GDB + pwndbg
├── 能做简单的 patch 和动态调试
└── 尝试：CrackMe 网站上的简单题目

第三阶段：CTF 实战（持续）
├── 从简单 RE 题开始刷
├── 学习常见加密算法识别
├── 学习 z3 约束求解
├── 学习 angr 符号执行（可选但很有用）
└── 平台：攻防世界、BUUOJ、CTFTime

第四阶段：进阶（按需）
├── Windows PE 逆向
├── ARM / MIPS 架构
├── 反混淆、脱壳
├── 恶意软件分析
└── 虚拟机保护 (VMProtect / Themida)
```

### 12.2 极力推荐的学习资源

| 资源 | 说明 |
|------|------|
| **[Compiler Explorer (godbolt.org)](https://godbolt.org)** | **最重要的工具！** 在线写 C/C++ 代码，实时查看编译生成的汇编。调好编译选项 `-O0`（无优化）到 `-O2` 对比 |
| **[pwn.college](https://pwn.college)** | ASU 的 CTF 教学平台，从零开始有引导 |
| **[crackmes.one](https://crackmes.one)** | CrackMe 题目集合，按难度排序 |
| **[x86 指令参考](https://www.felixcloutier.com/x86/)** | 最好的 x86 指令速查手册 |
| **IDA Free / Ghidra** | IDA 有免费版（x86-64），Ghidra 完全免费（NSA 开源） |

### 12.3 快速上手建议

1. **现在就去 godbolt.org**，写一段简单的 C 代码（for 循环、if-else、指针操作），看编译器生成的汇编。用 `-O0` 看未优化的（最易读），再用 `-O2` 看优化后的（最接近实际逆向）。

2. **不要试图背指令**。你需要的不是背诵 500 条指令，而是理解 20 条核心指令 + 学会查手册。

3. **逆向的核心能力是 "模式识别"**：看到一段汇编，能快速反应出对应的 C 代码结构（if、for、switch、函数调用、结构体访问）。

4. **先静态后动态**：先用 IDA/Ghidra 阅读代码，画出程序逻辑，再用 GDB 动态验证你的推断。

5. **你的 C++ 和竞赛基础是巨大优势**：算法题型的 RE（如 DP、图论算法识别）你应该比别人更快。

---

## 13. 字节序（Endianness）—— 为什么内存看起来是反的

x86 使用 **小端序（Little-Endian）**：低位字节存放在低地址。

```c
uint32_t x = 0x12345678;
```

如果 `x` 位于地址 `0x1000`，内存中的排列是：

```
地址       字节
0x1000     78    ← 最低位字节
0x1001     56
0x1002     34
0x1003     12    ← 最高位字节
```

CPU 将这 4 字节整体读取成 `uint32_t` 后，寄存器中的值仍然是 `0x12345678`。

### 小端序主要影响什么？

- 用 GDB/hex editor 查看内存时，字节顺序与直觉相反
- 字节数组和整数之间的转换
- 文件格式和网络协议（网络通常是大端序）
- 手工拼接常量
- 分析 shellcode 或机器码

### CTF 中的典型例子

```asm
mov     dword [rax], 0x67616c66
```

内存中的字节顺序（小端序）：

```
66 6c 61 67
 f  l  a  g
```

这其实就是字符串 `"flag"`！

> **关键记忆**：在 IDA 中看到一个大的十六进制常量被 `mov` 到内存，先把字节反过来看看是不是 ASCII 字符串。

类似地：

```asm
mov     dword [rax], 0x7B465443    ; "CTF{"
mov     dword [rax+4], 0x7D303132  ; "210}"
```

拼接后就是 `"CTF{210}"`。

---

## 14. `setcc` 指令 —— 把比较结果存为 0 或 1

`setcc` 系列指令根据标志位将一个 **字节** 寄存器设为 0 或 1：

```asm
cmp     edi, esi
sete    al              ; al = (edi == esi) ? 1 : 0
```

等价 C：

```c
al = (edi == esi);
```

常见的 `setcc` 指令：

| 指令 | 含义 | C 等价 |
|------|------|--------|
| `sete` / `setz` | 相等 / 为零 | `a == b` |
| `setne` / `setnz` | 不相等 | `a != b` |
| `setg` | 有符号大于 | `(signed)a > (signed)b` |
| `setge` | 有符号大于等于 | `(signed)a >= (signed)b` |
| `setl` | 有符号小于 | `(signed)a < (signed)b` |
| `setle` | 有符号小于等于 | `(signed)a <= (signed)b` |
| `seta` | 无符号大于 | `(unsigned)a > (unsigned)b` |
| `setb` | 无符号小于 | `(unsigned)a < (unsigned)b` |

**逆向中的常见模式**：

```asm
xor     eax, eax        ; eax = 0（清零，同时也清了高位）
cmp     edi, esi
sete    al              ; al = 0 或 1
ret                     ; 返回 bool 值
```

这整段等价于：

```c
bool equal(int a, int b) {
    return a == b;
}
```

> **为什么用 `xor eax, eax` + `sete al` 而不是直接 `mov eax, 0/1`？**
> 因为 `sete` 只设置低 8 位（AL），其余位不变。先 `xor eax, eax` 确保高位都是 0，这样 RAX 的整体值就是 0 或 1。

---

## 15. RIP 相对寻址 —— 全局变量与常量

x86-64 开启 **PIE（Position Independent Executable）** 后，代码中的全局变量和字符串都通过 **RIP 相对寻址** 来访问：

```asm
mov     eax, [rip + 0x2a34]       ; 读取全局变量
lea     rdi, [rip + 0x1b20]       ; 取得字符串/全局对象的地址
```

### `lea` vs `mov` + RIP

```asm
lea     rdi, [rip + ...]      ; rdi = 地址（取地址，不读内存）
mov     rdi, [rip + ...]      ; rdi = *(该地址)（读取内存中的值）
```

**这两个操作完全不同！**

### 典型场景

```asm
lea     rdi, [rip + 0x1234]    ; rdi = 字符串 "hello" 的地址
call    puts                    ; puts("hello")
```

等价 C：

```c
puts("hello");
```

```asm
mov     eax, [rip + 0x5678]    ; 读取全局变量 counter 的值
add     eax, 1
mov     [rip + 0x5678], eax    ; 写回
```

等价 C：

```c
counter++;
```

> **逆向技巧**：在 IDA 中，RIP 相对寻址的目标地址通常已经被自动解析成符号名或字符串。如果没有，可以手动按 `D`（定义数据）或 `A`（定义 ASCII 字符串）。

---

## 16. 符号扩展与零扩展 —— 深入理解

### 为什么需要扩展？

当你把一个小的数据类型放到一个大的寄存器里时，高位怎么填？

```
8 位值 0xFF 放到 32 位寄存器：
  ├── 零扩展 → 0x000000FF = 255  （unsigned char → unsigned int）
  └── 符号扩展 → 0xFFFFFFFF = -1  （signed char → int）
```

### 核心指令

| 指令 | 作用 | 典型用途 |
|------|------|---------|
| `movzx eax, byte [rdi]` | 零扩展 8→32 位 | 读取 `unsigned char` |
| `movzx eax, word [rdi]` | 零扩展 16→32 位 | 读取 `unsigned short` |
| `movsx eax, byte [rdi]` | 符号扩展 8→32 位 | 读取 `signed char` |
| `movsx eax, word [rdi]` | 符号扩展 16→32 位 | 读取 `short` |
| `movsxd rax, eax` | 符号扩展 32→64 位 | `int` → `long`（常见于数组索引） |

### `movsxd` —— 容易忽略但很重要

```asm
movsxd  rax, edi            ; 将 32 位有符号 int 扩展为 64 位
```

常见于用 `int` 类型的索引去访问数组时：

```c
long arr[100];
int i = get_index();
return arr[i];          // i 需要从 int 符号扩展到 long 用作地址偏移
```

```asm
call    get_index
movsxd  rcx, eax            ; int → long（有符号扩展）
mov     rax, [rdi + rcx*8]  ; arr[i]
```

### 逆向中的类型推断

看到 `movzx` → 这个变量可能是 `unsigned char` 或 `unsigned short`
看到 `movsx` → 这个变量可能是 `signed char` 或 `short`
看到 `movsxd` → 这个变量可能是 `int`（32 位有符号）用作 64 位上下文

---

## 17. 完整逆向实例分析 —— 从汇编还原 C 代码

### 目标汇编

```asm
check:
    test    rdi, rdi
    je      .fail

    cmp     byte [rdi], 0x43
    jne     .fail

    cmp     byte [rdi+1], 0x54
    jne     .fail

    xor     eax, eax
    cmp     byte [rdi+2], 0x46
    sete    al
    ret

.fail:
    xor     eax, eax
    ret
```

### 分步分析过程

**第一步：识别参数**

Linux x86-64 中第一个参数在 `rdi`。函数名是 `check`，参数类型待定。

**第二步：识别空指针检查**

```asm
test    rdi, rdi        ; rdi & rdi，检查是否为 0
je      .fail           ; 如果 rdi == 0（NULL），跳到失败
```

→ `if (s == nullptr) return 0;`
→ 参数是指针类型

**第三步：识别字符比较**

```asm
cmp     byte [rdi], 0x43      ; 0x43 = 'C'
cmp     byte [rdi+1], 0x54    ; 0x54 = 'T'
cmp     byte [rdi+2], 0x46    ; 0x46 = 'F'
```

使用 `byte` 访问 + 递增偏移 → 这是 `char*` 字符串的逐字符访问。

> **技巧**：遇到十六进制常量，先查 ASCII 表。`0x41`='A', `0x5A`='Z', `0x61`='a', `0x7A`='z', `0x30`='0', `0x39`='9'。

**第四步：识别返回值**

```asm
xor     eax, eax        ; eax = 0
cmp     byte [rdi+2], 0x46
sete    al              ; 如果相等 al = 1，否则 al = 0
ret                     ; 返回 eax（0 或 1）
```

**第五步：还原 C 代码**

```c
int check(const char *s) {
    if (s == NULL)
        return 0;
    if (s[0] != 'C')
        return 0;
    if (s[1] != 'T')
        return 0;
    if (s[2] != 'F')
        return 0;
    return 1;
}
```

可以进一步简化为：

```c
int check(const char *s) {
    return s != NULL && s[0] == 'C' && s[1] == 'T' && s[2] == 'F';
}
```

> **核心方法论**：不要逐行死翻译，而是先理解控制流骨架（哪些分支到哪里），再填充每个分支的数据操作语义，最后抽象成高级代码。

---

## 18. 编译优化对逆向的影响

建议自己写 C 程序，分别用不同优化等级编译后对比：

```bash
gcc -O0 demo.c -o demo_O0    # 无优化
gcc -O1 demo.c -o demo_O1    # 轻度优化
gcc -O2 demo.c -o demo_O2    # 标准优化（大多数发行版默认）
gcc -O3 demo.c -o demo_O3    # 激进优化
```

### `-O0`（无优化）

- 结构非常接近源码
- 局部变量几乎都放在栈上
- 指令冗余，效率低
- **适合学习**：源码和汇编几乎一一对应

### `-O2`（标准优化）

- 很多变量消失或被放到寄存器
- 函数可能被内联
- 控制流被改写（分支合并、循环展开）
- 寄存器复用严重
- **更接近 CTF 真题**

### 优化示例

```c
int f() {
    int x = 3;
    int y = 4;
    return x + y;
}
```

`-O0` 编译：

```asm
push    rbp
mov     rbp, rsp
mov     dword [rbp-4], 3     ; x = 3
mov     dword [rbp-8], 4     ; y = 4
mov     eax, [rbp-4]
add     eax, [rbp-8]         ; x + y
pop     rbp
ret
```

`-O2` 编译：

```asm
mov     eax, 7                ; 编译器直接算出结果
ret
```

`x` 和 `y` 根本不存在了！

### 编译器常见优化手段

| 优化 | 效果 |
|------|------|
| 常量折叠 | `3 + 4` 直接变成 `7` |
| 死代码消除 | 不会执行到的代码直接删除 |
| 内联展开 | 小函数的代码直接插入到调用处 |
| 循环展开 | `for (i=0; i<4; i++)` 展开成 4 条指令 |
| 强度削减 | 乘法变成移位和加法：`x*5` → `lea eax,[rax+rax*4]` |
| 除法变乘法 | `x/7` 变成 `x * 0x24924925 >> 33`（乘魔数） |
| 条件传送 | `if-else` 变成 `cmov`（无分支） |
| 省略帧指针 | 不用 RBP 作为帧指针，全用 RSP 偏移 |

> **学习顺序**：先用 `-O0` 理解 C→汇编的映射 → 再用 `-O2` 理解优化后的变形。不要一开始就啃高度优化的代码。

---

## 19. C++ 逆向的额外复杂度

有 C++ 基础并不意味着马上能看懂 C++ 反汇编。C++ 引入了很多 C 没有的东西：

### 19.1 `this` 指针

```cpp
class Player {
public:
    int hp;
    int getHp() { return hp; }
};
```

本质上等价于：

```c
int Player_getHp(Player *this) {
    return this->hp;
}
```

在汇编中：
- **Linux**：`this` 在 `rdi`（第一个参数）
- **Windows**：`this` 在 `rcx`（第一个参数）

```asm
; Linux x86-64: Player::getHp()
mov     eax, [rdi]       ; return this->hp（偏移 0）
ret
```

### 19.2 名字修饰（Name Mangling）

C++ 编译器会把函数名修饰成包含参数类型信息的符号：

```
_ZN6Player5getHpEv
```

解读：`Player::getHp(void)`

使用 `c++filt` 命令解码：

```bash
echo "_ZN6Player5getHpEv" | c++filt
# 输出：Player::getHp()
```

IDA 和 Ghidra 通常会自动解码。

### 19.3 虚函数的两次解引用

```asm
mov     rax, [rdi]              ; rax = vtable 指针（对象的前 8 字节）
call    qword [rax + 0x10]      ; 调用 vtable[2]
```

看到 **"连续两次解引用后间接调用"** → 虚函数调用。

### 19.4 STL 的建议

`std::string`、`std::vector`、`std::map` 的内部实现：
- 依赖编译器和标准库版本
- 有小字符串优化（SSO）
- 结构体内部字段复杂

> **建议**：先熟练逆向纯 C 风格程序，再进入 C++ 对象和 STL。

---

## 20. CTF RE 做题标准流程（10 步）

拿到一道逆向题后，**不要一上来就从 main 逐行读**。按以下流程系统分析：

### 步骤 1：确认文件信息

```bash
file chall              # ELF? PE? 32/64 位? 架构?
checksec chall           # 保护机制：PIE? NX? Canary?
readelf -h chall         # ELF 头详细信息
```

### 步骤 2：直接运行一次

观察程序的行为：
- 要求输入什么？
- 输出什么？
- 需要参数或文件吗？
- 错误输入的反应？

### 步骤 3：查看字符串

```bash
strings -a chall | grep -iE "correct|wrong|flag|password|input|success|fail"
```

### 步骤 4：查看导入函数

重点关注：

| 类别 | 函数 |
|------|------|
| 输入 | `scanf`, `fgets`, `read`, `gets`, `std::cin` |
| 比较 | `strcmp`, `strncmp`, `memcmp` |
| 输出 | `puts`, `printf` |
| 内存 | `malloc`, `free`, `mmap` |
| 加密 | `EVP_*`, `AES_*`, `SHA*` |
| 反调试 | `ptrace`, `IsDebuggerPresent` |

### 步骤 5：找到成功/失败分支

从 `"Correct"`、`"Wrong"` 等字符串的 **交叉引用** 入手，定位关键判断逻辑。

### 步骤 6：逆向输入数据流

```
输入在哪里？
  → 传给了哪个函数？
    → 经过了哪些变换（循环、异或、查表）？
      → 最终和什么比较？
```

### 步骤 7：给函数和变量重命名

不要一直看 `sub_401230`、`v3`、`a1`。根据理解改名：

```
sub_401234 → transform_input
sub_401450 → check_result
v5 → loop_index
v8 → expected_byte
```

**命名本身就是分析过程。**

### 步骤 8：把关键逻辑抄成伪代码

不要完全相信反编译器。自己重写一遍，确保理解：

```c
for (int i = 0; i < 32; i++) {
    out[i] = ((input[i] ^ key[i % 4]) + i) & 0xff;
}
```

### 步骤 9：写脚本求解

```python
expected = [0x78, 0x6a, 0x5c, ...]  # 从 IDA 中提取
key = [0x11, 0x22, 0x33, 0x44]

flag = []
for i, x in enumerate(expected):
    c = ((x - i) & 0xff) ^ key[i % len(key)]
    flag.append(c)

print(bytes(flag))
```

### 步骤 10：验证

把求解出的输入喂给程序，确认输出 "Correct!" 或得到 flag。

---

## 21. 常见误区

### 误区 1：背完所有指令才能做题

不需要。常用指令只有 20-30 条，其余遇到再查 [x86 指令参考](https://www.felixcloutier.com/x86/)。

### 误区 2：只看反编译伪代码

反编译器经常犯错：
- 类型推断错误（把指针当整数）
- 有符号/无符号判断错误
- 数组边界错误
- 无法识别间接跳转
- 把结构体显示成指针算术

**当伪代码看起来奇怪时，必须切到汇编视图看原始代码。**

### 误区 3：逐行翻译，不看整体

看到这段汇编：

```asm
xor     eax, eax
cmp     edi, esi
sete    al
ret
```

不要翻译成 "eax 异或自身，比较 edi 和 esi，相等时设置 al，返回"。

应该直接抽象成：

```c
return edi == esi;
```

### 误区 4：认为寄存器有固定用途

除了 `RSP`（栈指针）和 `RIP`（指令指针），大多数通用寄存器只是临时容器。

- `RAX` 不是永远都是返回值——只在函数返回时才是
- `RDI` 不是永远都是第一个参数——只在函数调用边界才是
- 函数内部，编译器可以把任何数据放在任何寄存器

### 误区 5：把 `lea` 总当成取地址

```asm
lea     eax, [rdi + rdi*4]      ; eax = rdi * 5
```

这跟指针没有任何关系，只是编译器用 `lea` 做快速乘法。

### 误区 6：忽略数据宽度

```asm
mov     al, [rdi]       ; 读 1 字节
mov     eax, [rdi]      ; 读 4 字节
mov     rax, [rdi]      ; 读 8 字节
```

完全不是一回事！忽略宽度会导致逻辑推断完全错误。

### 误区 7：忽略有符号与无符号

```asm
jg      .target         ; 有符号大于
ja      .target         ; 无符号大于
```

虽然中文都翻译成"大于"，但它们比较的标志位完全不同。搞混了整个条件逻辑就错了。

---

## 22. 教材取舍建议

《计算机组成与设计》不需要为了 CTF 从头逐字读完。

### ✅ 必须掌握

- 指令集和机器语言的关系
- 寄存器与内存
- 寻址方式
- 算术和逻辑运算
- 条件分支
- 过程调用（函数）
- 栈
- 数据表示（补码、溢出）

### ⏭️ 可以快速浏览

- RISC-V 每条指令的编码细节（CTF 用不到）
- 数据通路的控制信号
- 流水线冒险的完整推导
- 浮点硬件的实现

### 📌 后期有价值

- 缓存 → 侧信道攻击
- 虚拟内存 → pwn 题的内存布局
- 异常和中断 → 信号处理、内核逆向

---

## 23. 编译器驱动学习法 —— 推荐练习

**这是最高效的学习方法**：写一个小 C 函数 → 猜它的汇编 → 在 [godbolt.org](https://godbolt.org) 验证 → 用 GDB 单步确认。

### 从简单到复杂的练习序列

分别用 `-O0` 和 `-O2` 编译，观察差异：

```c
// 1. 最简单的函数
int f(int x) { return x + 1; }

// 2. 指针解引用
int f(int *p) { return *p; }

// 3. 数组索引（注意 scale）
int f(int *p, int i) { return p[i]; }

// 4. char 数组索引（对比 scale 的不同）
int f(char *p, int i) { return p[i]; }

// 5. 乘法优化（编译器会用 lea）
int f(int x) { return x * 5; }

// 6. 比较和 setcc
bool f(int x, int y) { return x > y; }

// 7. 字符串遍历
int f(const char *s) {
    int n = 0;
    while (s[n]) n++;
    return n;
}

// 8. 结构体访问
struct Point { int x; int y; };
int f(struct Point *p) { return p->x + p->y; }

// 9. 条件分支
int f(int x) { return x > 0 ? x : -x; }

// 10. 递归
int f(int n) { return n <= 1 ? 1 : n * f(n-1); }
```

### 每个练习都问自己

1. 参数在哪些寄存器？
2. 返回值在哪里？
3. 访问了几字节？
4. 寻址 scale 为什么是 1/2/4/8？
5. 是有符号比较还是无符号比较？
6. `-O2` 下编译器做了什么优化？

---

## 附录 A：x86-64 常用指令速查表

| 类别 | 指令 | 作用 | C 等价 |
|------|------|------|--------|
| **传送** | `mov dst, src` | `dst = src` | 赋值 |
| | `lea dst, [addr]` | `dst = &addr` | 取地址 / 快速算术 |
| | `movzx dst, src` | 零扩展传送 | `(unsigned)src` |
| | `movsx dst, src` | 符号扩展传送 | `(signed)src` |
| **算术** | `add dst, src` | `dst += src` | `+` |
| | `sub dst, src` | `dst -= src` | `-` |
| | `imul dst, src` | `dst *= src` | `*` |
| | `idiv src` | `RAX = RDX:RAX / src` | `/` |
| | | `RDX = RDX:RAX % src` | `%` |
| | `inc dst` | `dst++` | `++` |
| | `dec dst` | `dst--` | `--` |
| | `neg dst` | `dst = -dst` | 取负 |
| **位运算** | `and dst, src` | `dst &= src` | `&` |
| | `or dst, src` | `dst \|= src` | `\|` |
| | `xor dst, src` | `dst ^= src` | `^` |
| | `not dst` | `dst = ~dst` | `~` |
| | `shl dst, n` | `dst <<= n` | `<<` |
| | `shr dst, n` | `dst >>= n` (unsigned) | `>>` (unsigned) |
| | `sar dst, n` | `dst >>= n` (signed) | `>>` (signed) |
| **比较** | `cmp a, b` | 设置标志位（a - b） | `if (a ○ b)` |
| | `test a, b` | 设置标志位（a & b） | `if (a & b)` |
| **跳转** | `jmp label` | 无条件跳转 | `goto` |
| | `je/jz` | 等于时跳转 | `==` |
| | `jne/jnz` | 不等于时跳转 | `!=` |
| | `jg/jge/jl/jle` | 有符号比较跳转 | `> >= < <=` (signed) |
| | `ja/jae/jb/jbe` | 无符号比较跳转 | `> >= < <=` (unsigned) |
| **栈** | `push src` | `RSP -= 8; [RSP] = src` | 入栈 |
| | `pop dst` | `dst = [RSP]; RSP += 8` | 出栈 |
| **调用** | `call func` | `push RIP+指令长度; jmp func` | 函数调用 |
| | `ret` | `pop RIP` | return |
| | `leave` | `mov RSP, RBP; pop RBP` | 函数尾声 |
| **条件设置** | `sete/setz dst` | 等于时 dst=1 | `dst = (a == b)` |
| | `setne/setnz dst` | 不等于时 dst=1 | `dst = (a != b)` |
| | `setg/setl dst` | 有符号大于/小于时 dst=1 | `dst = (a > b)` / `(a < b)` |
| | `seta/setb dst` | 无符号大于/小于时 dst=1 | `dst = (a > b)` / `(a < b)` |
| **其他** | `nop` | 无操作 | - |
| | `xchg a, b` | 交换 a 和 b | `swap(a, b)` |
| | `cdq` | EAX 符号扩展到 EDX:EAX | 除法前准备 |
| | `cqo` | RAX 符号扩展到 RDX:RAX | 除法前准备 |
| | `movsxd dst, src` | 32→64 位符号扩展 | `(long)(int)src` |
| | `syscall` | 系统调用 | - |
| | `int 0x80` | 32 位系统调用 | - |
| | `rep movsb` | 复制 RCX 字节 RSI→RDI | `memcpy` |
| | `rep stosb` | 用 AL 填充 RCX 字节到 RDI | `memset` |

---

## 附录 B：GDB 常用命令速查

| 命令 | 作用 |
|------|------|
| `b *addr` | 在地址处下断点 |
| `b func` | 在函数入口下断点 |
| `r` | 运行程序 |
| `r < input.txt` | 运行并重定向输入 |
| `c` | 继续执行 |
| `ni` | 单步执行（不进入函数） |
| `si` | 单步执行（进入函数） |
| `finish` | 执行到当前函数返回 |
| `info reg` | 显示寄存器 |
| `p/x $rax` | 以 16 进制打印 rax |
| `x/10gx $rsp` | 以 8 字节为单位查看栈 |
| `x/s addr` | 查看字符串 |
| `x/20i $rip` | 查看 20 条指令 |
| `disas func` | 反汇编函数 |
| `set $rax = 0` | 修改寄存器 |
| `set *(int*)addr = val` | 修改内存 |
| `info b` | 列出断点 |
| `del N` | 删除第 N 个断点 |
| `bt` | 查看调用栈 |
| `vmmap` | 查看内存映射（pwndbg） |
| `telescope $rsp 20` | 查看栈内容（pwndbg） |

---

> **最后的话**：逆向工程是一门 "看得越多，就越熟练" 的技能。前面的知识是地基，真正的进步来自于大量做题和实战。建议每天至少看 30 分钟汇编代码（在 godbolt 上或做 CTF 题），很快你就会建立起 "汇编 ↔ C" 的双向映射直觉。加油！🚀
