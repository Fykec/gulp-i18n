if(!window.i18n) {
   window.i18n = function (name) {

       function replaceWithString(text, string) {
           text = text.replace('%s', string)
           return text
       }

       function replaceWithArray(text, array) {
           var i = 0
           while(text.indexOf('%s') >= 0) {
               text = text.replace('%s', array[i])
               i++
           }
           return text
       }

       function replaceWithDictionary(text, dic) {
           // replace the text "test {key1} {key2} {key1}" with {key1: value1, key2: value2} to  "test value1 value2 value1"
           Object.keys(dic).forEach(function (key) {
               var reg = new RegExp('{' + key + '}', 'g')
               text = text.replace(reg, dic[key])
           })
           return text
       }

       var input = document.getElementById('i18n-str-' + name)
       var text = input? input.value: name
       if (arguments.length > 1) {
           if (Object.prototype.toString.call(arguments[1]) === '[object String]') {
               return replaceWithString(text, arguments[1])
           }
           else if (Object.prototype.toString.call(arguments[1]) === '[object Array]') {
               return replaceWithArray(text, arguments[1])
           }
           else if (Object.prototype.toString.call(arguments[1]) === '[object Object]') {
               return replaceWithDictionary(text, arguments[1])
           }
       }
       return text;
   }
}
