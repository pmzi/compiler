# compiler

A simple compiler which compiles code to AST and checks for semantic and syntax error.

## Usage

First of all, [nodejs](https://nodejs.org/en/) is required.

```bash
$ npm install
```

After that write your code inside a.txt and then execute:

```
$ node index.js
```

## Syntax

Language Syntax is described below:

### Variable declaration

Supported variable types are int, double ans string.

Syntax & Example:

```
string a = 'myString';

int b = 10;

double c = 12.3;
```

### If

Syntax:

```
if exp:
//
else if exp:
//
else:
//
end if;
```

Example:

```
if a == 3:
  string bb = 'salam';
else if a < 3:
  string cc = 'dude';
else:
  string j = 'bye';
end if;
```

### For

Syntax & Example:

```
for i from 0 to 10:
  string j = 'ss';
end for;
```

### Function

Syntax & Example:

```
int function sala1m(int a, string b = 'salam'):
  return a;
end function;

// some code after that

int g = sala1m(1, 'salam');
```