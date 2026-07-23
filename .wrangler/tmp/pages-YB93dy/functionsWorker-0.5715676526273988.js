var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/chat.js
var SYSTEM_PROMPT = `\u4F60\u662F\u4E00\u4E2A\u5E7D\u9ED8\u98CE\u8DA3\u7684\u5916\u5356\u63A8\u8350\u52A9\u624B\uFF0C\u540D\u5B57\u53EB"\u996D\u996D"\u{1F354}\u3002

## \u6838\u5FC3\u89C4\u5219
- \u6BCF\u6B21\u56DE\u590D\u53EA\u505A\u4E00\u4EF6\u4E8B\uFF1A\u95EE\u4E00\u4E2A\u5E26\u9009\u9879\u7684\u9009\u62E9\u9898
- \u6BCF\u9053\u9898\u63D0\u4F9B 3~4 \u4E2A\u9009\u9879\uFF0C\u7528\u6237\u53EA\u9700\u70B9\u51FB\u9009\u62E9
- \u9009\u9879\u4E4B\u95F4\u4E92\u65A5\u4E14\u6709\u533A\u5206\u5EA6
- \u6700\u540E\u4E00\u4E2A\u9009\u9879\u53EF\u4EE5\u662F"\u90FD\u53EF\u4EE5"/"\u4F60\u63A8\u8350"

## \u56DE\u590D\u683C\u5F0F\uFF08\u4E25\u683C\u9075\u5FAA\uFF09
\u6BCF\u6B21\u56DE\u590D\u90FD\u6309\u4EE5\u4E0B\u683C\u5F0F\uFF0C\u4E0D\u8981\u52A0\u591A\u4F59\u7684\u8BDD\uFF1A

[\u95EE\u9898\u7684\u6587\u5B57\u63CF\u8FF0]
A. [\u9009\u9879A]
B. [\u9009\u9879B]
C. [\u9009\u9879C]
D. [\u9009\u9879D]\uFF08\u53EF\u9009\uFF09

## \u6027\u683C
- \u8BED\u6C14\u8F7B\u677E\u6D3B\u6CFC\uFF0C\u50CF\u670B\u53CB\u804A\u5929
- \u9002\u5F53\u4F7F\u7528 emoji\uFF08\u6BCF\u884C1-2\u4E2A\uFF09
- \u95EE\u9898\u63A7\u5236\u5728 40 \u5B57\u4EE5\u5185\uFF0C\u9009\u9879\u63A7\u5236\u5728 8 \u5B57\u4EE5\u5185
- \u7528"\u4F60"\u79F0\u547C\u7528\u6237

## \u95EE\u9898\u7B56\u7565\uFF08\u53C2\u8003\uFF0C\u7075\u6D3B\u8C03\u6574\uFF09
\u53E3\u5473 \u2192 \u83DC\u7CFB \u2192 \u8089\u7C7B\u504F\u597D \u2192 \u5FCC\u53E3 \u2192 \u4E3B\u98DF\u642D\u914D \u2192 \u6E29\u5EA6 \u2192 \u9884\u7B97 \u2192 \u4EFD\u91CF \u2192 \u996E\u54C1 \u2192 \u573A\u666F\u786E\u8BA4

## \u63A8\u8350\u89C4\u5219
\u5728\u6536\u96C6\u4E86\u7EA610\u8F6E\u504F\u597D\u540E\uFF0C\u4E0D\u8981\u518D\u7528\u9009\u62E9\u9898\u683C\u5F0F\u3002
\u76F4\u63A5\u5728\u56DE\u590D\u672B\u5C3E\u9644\u52A0 JSON\uFF08\u5FC5\u987B\u82F1\u6587 key\uFF09\uFF1A

{"cuisine":"\u5DDD\u83DC","dish":"\u6C34\u716E\u725B\u8089\u9762+\u9178\u6885\u6C64","reason":"\u9EBB\u8FA3\u9C9C\u9999\u6B63\u597D\u6EE1\u8DB3\u4F60\u5BF9\u8FA3\u5473\u7684\u6E34\u671B","funFact":"\u5403\u8FA3\u80FD\u91CA\u653E\u5185\u5561\u80BD\u8BA9\u4F60\u5F00\u5FC3\uFF01"}

\u63A8\u8350\u5FC5\u987B\u5177\u4F53\u5230\u83DC\u54C1\u3002`;
var FINAL_HINT = `

\u26A0\uFE0F \u4F60\u5DF2\u7ECF\u6536\u96C6\u4E86\u8DB3\u591F\u591A\u7684\u504F\u597D\u4FE1\u606F\u3002\u73B0\u5728\u4E0D\u8981\u518D\u7528\u9009\u62E9\u9898\u683C\u5F0F\u3002\u76F4\u63A5\u7ED9\u51FA\u63A8\u8350\uFF0C\u5E76\u5728\u56DE\u590D\u672B\u5C3E\u9644\u4E0A\u6307\u5B9A\u683C\u5F0F\u7684 JSON\uFF08\u82F1\u6587 key\uFF1Acuisine, dish, reason, funFact\uFF09\u3002`;
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};
async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS });
  }
  if (request.method !== "POST") {
    return json(405, { success: false, error: "\u4EC5\u652F\u6301 POST" });
  }
  try {
    const body = await request.json();
    const { messages } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json(400, { success: false, error: "\u8BF7\u63D0\u4F9B\u6709\u6548\u7684 messages" });
    }
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    const isFinalRound = userMsgCount >= 10;
    const systemContent = isFinalRound ? SYSTEM_PROMPT + FINAL_HINT : SYSTEM_PROMPT;
    const aiText = await callDeepSeek(env, systemContent, messages);
    const recommendation = parseRecommendation(aiText);
    if (isFinalRound || recommendation) {
      const rec = recommendation || fallbackRecommendation(aiText);
      return json(200, {
        success: true,
        content: formatRecommendText(rec),
        round: userMsgCount,
        isComplete: true,
        recommendation: rec
      });
    }
    const { question, options } = parseMultipleChoice(aiText);
    return json(200, {
      success: true,
      content: question,
      options: options.length >= 2 ? options : ["A. \u597D\u7684 \u{1F44D}", "B. \u6362\u4E00\u4E2A \u{1F914}", "C. \u4F60\u63A8\u8350 \u{1F60B}"],
      round: userMsgCount,
      isComplete: false
    });
  } catch (error) {
    console.error("API Error:", error.message);
    return json(500, { success: false, error: "\u670D\u52A1\u5668\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" });
  }
}
__name(onRequest, "onRequest");
function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
__name(json, "json");
async function callDeepSeek(env, systemContent, messages) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY \u672A\u8BBE\u7F6E");
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemContent },
        ...messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) }))
      ],
      temperature: 0.8,
      max_tokens: 500
    })
  });
  if (!response.ok) {
    throw new Error(`DeepSeek API \u8FD4\u56DE ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
__name(callDeepSeek, "callDeepSeek");
function parseMultipleChoice(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  const options = [];
  const questionLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match2 = trimmed.match(/^([A-D])[.、．)\s]\s*(.+)/);
    if (match2) {
      options.push(`${match2[1]}. ${match2[2].trim()}`);
    } else {
      if (!trimmed.startsWith("{") && !trimmed.startsWith("```")) {
        questionLines.push(trimmed);
      }
    }
  }
  return {
    question: questionLines.join("\n") || "\u6765\u9009\u4E00\u4E2A\u5427~ \u{1F60B}",
    options
  };
}
__name(parseMultipleChoice, "parseMultipleChoice");
function parseRecommendation(text) {
  try {
    const match2 = text.match(/\{[\s\S]*"cuisine"[\s\S]*"dish"[\s\S]*\}/);
    if (!match2) return null;
    const parsed = JSON.parse(match2[0]);
    const cuisine = parsed.cuisine || parsed["\u83DC\u7CFB"] || parsed["\u63A8\u8350\u83DC\u7CFB"] || "";
    const dish = parsed.dish || parsed["\u83DC\u54C1"] || parsed["\u63A8\u8350\u83DC\u54C1"] || "";
    const reason = parsed.reason || parsed["\u7406\u7531"] || parsed["\u63A8\u8350\u7406\u7531"] || "";
    const funFact = parsed.funFact || parsed["\u8DA3\u5473"] || parsed["\u8DA3\u5473\u8BC4\u8BED"] || "";
    if (cuisine || dish) {
      return {
        cuisine: String(cuisine).slice(0, 20) || "\u4ECA\u65E5\u63A8\u8350",
        dish: String(dish).slice(0, 30) || "\u7CBE\u9009\u7F8E\u98DF",
        reason: String(reason || "\u6839\u636E\u4F60\u7684\u53E3\u5473\u7CBE\u5FC3\u63A8\u8350").slice(0, 60),
        funFact: String(funFact || "\u5E0C\u671B\u4F60\u559C\u6B22\uFF01\u{1F37D}\uFE0F").slice(0, 30)
      };
    }
  } catch {
  }
  return null;
}
__name(parseRecommendation, "parseRecommendation");
function fallbackRecommendation(text) {
  return {
    cuisine: "\u4ECA\u65E5\u7CBE\u9009",
    dish: "\u6765\u70B9\u60CA\u559C\u5427",
    reason: text.slice(0, 60),
    funFact: "\u5E0C\u671B\u4F60\u5403\u5F97\u5F00\u5FC3\uFF01\u2728"
  };
}
__name(fallbackRecommendation, "fallbackRecommendation");
function formatRecommendText(rec) {
  return [
    `\u{1F389} \u6839\u636E\u4F60\u7684\u53E3\u5473\uFF0C\u6211\u63A8\u8350\uFF1A`,
    ``,
    `\u{1F37D}\uFE0F **${rec.cuisine} \u2014 ${rec.dish}**`,
    ``,
    `\u{1F4A1} ${rec.reason}`,
    ``,
    `\u2728 ${rec.funFact}`
  ].join("\n");
}
__name(formatRecommendText, "formatRecommendText");

// ../.wrangler/tmp/pages-YB93dy/functionsRoutes-0.39821974130818916.mjs
var routes = [
  {
    routePath: "/api/chat",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// C:/Users/tianluo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// C:/Users/tianluo/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
