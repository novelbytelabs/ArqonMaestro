parser grammar CommandParser ;

options { tokenVocab=CommandLexer; }

main : commandChain EOF ;
mainWithoutPrepositions : commandChainWithoutPrepositions EOF ;

commandChain :
    metaCommand |
    unchainableCommand |
    repeat |
    command+ (prepositionSelection | repeat)?
;

commandChainWithoutPrepositions :
    metaCommand |
    unchainableCommand |
    repeat |
    command+ repeat?
;

metaCommand :
    cancel |
    use
;

unchainableCommand :
    next |
    back |
    tryCommand
;

// prioritization order for commands like cut, copy, select, etc:
// 1. commands with no text component ("delete line", since "line" is a raw selector)
// 2. commands with a text component ("delete foo", since "foo" is an implicit phrase)
// 3. short commands that are prefixes of longer commands
//    * "copy phrase foo" should not be "copy, phrase foo" ("copy" is a command, "phrase foo" is an implicit go to)
//    * "delete space" should not be "delete, space" ("delete" is a command, "space" is a press command)
//    * "type parameter" should not be "type, parameter" ("type" is an implicit go to, "parameter" is an implicit go to)
command :
    // special case: newline contains type, etc.
    newline quantifier? |

    // special case: prioritize "type parameter" over "type, parameter"
    type |

    // rule #1: commands without a text component
    comment |
    indent |
    sort |
    goTo |
    goToSyntaxError |
    copy |
    select |
    changeAll |
    change |
    joinLines |

    debug |
    edit |
    showDictationBox |
    dictateStart |
    dictateStop |
    goToDefinition |
    languageMode |
    pause |
    send |
    show |
    (
        changeWindow |
        close |
        cut |
        inspect |
        delete |
        goTo |
        paste |
        redo |
        reload |
        save |
        scroll |
        select |
        style |
        setTextStyle |
        switchWindow |
        tabs |
        undoCloseTab |
        undo
    ) quantifier? |
    arrowKeyWithQuantifier |

    // rule #2: commands with a text component
    apply |
    autocomplete |
    changeAll |
    change |
    click |
    duplicate |
    goToPhrase |
    run |
    scrollPhrase |
    focus |
    launch |
    add |
    openFile |
    rename |
    shift |
    surroundWith |
    systemInsert |
    dictate |
    insert |
    click |

    // rule #3: short commands that are prefixes of longer commands
    bareCopy |
    bareCut |
    bareInspect |
    press quantifier? | // press includes rules like "delete"

    // de-prioritize "forward, delete" below the "forward delete" key in press.
    forward quantifier?
;

quantifier :
    ONCE |
    TWICE |
    THRICE |
    numberRange1To99 (TIME | TIMES)
;

numbers : number+ ;
formattedText : .+ ;

validLanguage :
    AUTO |
    BASH |
    C |
    (C PLUS PLUS) |
    (C SHARP) |
    CSS |
    DART |
    GO |
    HTML |
    JAVA |
    JAVASCRIPT |
    KOTLIN |
    PYTHON |
    RUBY |
    RUST |
    SCSS |
    TYPESCRIPT
;

allDeterminers: (THE | AN | A)? ;
the: THE? ;
called: (CALLED | NAMED)? ;
endpoint : (the (START | END | BOTTOM | TOP | BEGINNING) OF)? ;
count : number ;
searchDirection : (the (NEXT | PREVIOUS | LEFT | RIGHT))? ;
movementDirection : (NEXT | PREVIOUS | FORWARD | BACK | LEFT | RIGHT | UP | DOWN) ;
vertical : UP | DOWN ;

selection : unnamedSelection | namedSelection ;
selectionWithImplicitPhrase : selection | phraseSelection ;

namedSelection :
    TO? endpoint (searchDirection | positional | allDeterminers) namedSelectionObject called formattedText
;
namedPositionSelection :
   endpoint (searchDirection | positional | allDeterminers) namedSelectionObject called formattedText
;

unnamedSelection :
    // same as unnamedPositionSelection, but with TO? prefix.
    TO? endpoint selectionObjectSingular number |
    TO? endpoint positional selectionObjectSingular |
    TO? endpoint searchDirection selectionObjectSingular |

    // additional absolute range
    FROM? selectionObjectSingular number (TO | THROUGH | UNTIL) selectionObjectSingular? number |
    selectionObjectPlural number (TO | THROUGH | UNTIL) number |
    the (FIRST | LAST) count selectionObjectPlural |

    // additional relative range
    searchDirection (ONE selectionObjectSingular | count selectionObjectPlural)
;

unnamedPositionSelection :
    // absolute range
    endpoint selectionObjectSingular number |
    endpoint positional selectionObjectSingular |

    // relative range
    endpoint searchDirection selectionObjectSingular
;

phraseSelectionPrefixSingular :
    // absolute range (the alternatives that end in with an object)
    TO? endpoint positional |

    // relative range
    TO? endpoint searchDirection |
    searchDirection ONE
;

phraseSelectionPrefixPlural :
    // absolute range (the alternatives that end in with an object)
    LAST count formattedText |

    // relative range
    searchDirection count formattedText
;

phraseSelection :
    phraseSelectionPrefixSingular formattedText |
    phraseSelectionPrefixPlural formattedText
;

// position selection exists separate from selection for accuracy reasons (even though it's fairly redundant)
// e.g., we want "go to three words" to be invalid
positionSelection : unnamedPositionSelection | namedPositionSelection  ;
positionSelectionWithImplicitPhrase : positionSelection | positionPhraseSelection ;

navigationPositionSelection:
    movementDirection ONE selectionObjectSingular |
    movementDirection count selectionObjectPlural
;

positionPhraseSelectionPrefix :
    // absolute range (the alternatives that end in with an object)
    endpoint positional |

    // relative range
    endpoint searchDirection
;

positionPhraseSelection : positionPhraseSelectionPrefix formattedText ;
positionPhraseRequiredSelection : positionPhraseSelectionPrefix PHRASE formattedText ;

preposition :
    AFTER |
    BEFORE
;

prepositionSelection : preposition positionSelectionWithImplicitPhrase ;

syntaxError : (SYNTAX)? ERROR;

selectionObjectSingular
    : returnValueNameListSingularObject
 | namedParameterListSingularObject
 | positionalParameterListSingularObject
 | returnValueNameSingularObject
 | topLevelStatementSingularObject
 | typeArgumentListSingularObject
 | typeParameterListSingularObject
 | argumentListSingularObject
 | assignmentValSingularObject
 | assignmentVariableSingularObject
 | attributeValSingularObject
 | attributeNameSingularObject
 | attributeTextSingularObject
 | closeTagSingularObject
 | commentTextSingularObject
 | doWhileSingularObject
 | elseIfSingularObject
 | foreachSingularObject
 | interfaceListSingularObject
 | keywordArgumentSingularObject
 | keywordParameterSingularObject
 | modifierSingularObject
 | modifierListSingularObject
 | namedParameterSingularObject
 | openTagSingularObject
 | parameterListSingularObject
 | parameterValSingularObject
 | parentListSingularObject
 | parentSingularObject
 | positionalParameterSingularObject
 | prototypeSingularObject
 | receiverArgumentSingularObject
 | returnTypeSingularObject
 | returnValSingularObject
 | stringTextSingularObject
 | typeAliasSingularObject
 | typeArgumentSingularObject
 | typeParameterSingularObject
 | withListSingularObject
 | withAliasSingularObject
 | withItemSingularObject
 | allSingularObject
 | argumentSingularObject
 | assertSingularObject
 | assignmentSingularObject
 | attributeSingularObject
 | beginSingularObject
 | blockSingularObject
 | bodySingularObject
 | breakSingularObject
 | callSingularObject
 | caseSingularObject
 | catchSingularObject
 | characterSingularObject
 | classSingularObject
 | commentSingularObject
 | conditionSingularObject
 | constructorSingularObject
 | contentSingularObject
 | continueSingularObject
 | debuggerSingularObject
 | declarationSingularObject
 | decoratorSingularObject
 | defaultSingularObject
 | deferSingularObject
 | dictionarySingularObject
 | elementSingularObject
 | elseSingularObject
 | ensureSingularObject
 | enumSingularObject
 | exceptSingularObject
 | exportSingularObject
 | forSingularObject
 | fileSingularObject
 | finallySingularObject
 | functionSingularObject
 | generatorSingularObject
 | getterSingularObject
 | hashSingularObject
 | ifSingularObject
 | importSingularObject
 | interfaceSingularObject
 | implementationSingularObject
 | keySingularObject
 | keyValuePairSingularObject
 | lambdaSingularObject
 | letterSingularObject
 | lineSingularObject
 | listSingularObject
 | loopSingularObject
 | methodSingularObject
 | mixinSingularObject
 | moduleSingularObject
 | nameSingularObject
 | namespaceSingularObject
 | numberSingularObject
 | objectSingularObject
 | operatorSingularObject
 | panicSingularObject
 | parameterSingularObject
 | passSingularObject
 | propertySingularObject
 | raiseSingularObject
 | rescueSingularObject
 | returnSingularObject
 | requireSingularObject
 | rulesetSingularObject
 | setSingularObject
 | setterSingularObject
 | statementSingularObject
 | stringSingularObject
 | structSingularObject
 | switchSingularObject
 | symbolSingularObject
 | synchronizedSingularObject
 | tagSingularObject
 | termSingularObject
 | throwSingularObject
 | traitSingularObject
 | tupleSingularObject
 | trySingularObject
 | typeSingularObject
 | untilSingularObject
 | usingSingularObject
 | withSingularObject
 | whileSingularObject
 | wordSingularObject
 | valueSingularObject
 | verticalSingularObject
 ;

selectionObjectPlural
    : returnValueNameListPluralObject
 | namedParameterListPluralObject
 | positionalParameterListPluralObject
 | returnValueNamePluralObject
 | topLevelStatementPluralObject
 | typeArgumentListPluralObject
 | typeParameterListPluralObject
 | argumentListPluralObject
 | assignmentValPluralObject
 | assignmentVariablePluralObject
 | attributeValPluralObject
 | attributeNamePluralObject
 | attributeTextPluralObject
 | closeTagPluralObject
 | commentTextPluralObject
 | doWhilePluralObject
 | elseIfPluralObject
 | foreachPluralObject
 | interfaceListPluralObject
 | keywordArgumentPluralObject
 | keywordParameterPluralObject
 | modifierPluralObject
 | modifierListPluralObject
 | namedParameterPluralObject
 | openTagPluralObject
 | parameterListPluralObject
 | parameterValPluralObject
 | parentListPluralObject
 | parentPluralObject
 | positionalParameterPluralObject
 | prototypePluralObject
 | receiverArgumentPluralObject
 | returnTypePluralObject
 | returnValPluralObject
 | stringTextPluralObject
 | typeAliasPluralObject
 | typeArgumentPluralObject
 | typeParameterPluralObject
 | withListPluralObject
 | withAliasPluralObject
 | withItemPluralObject
 | allPluralObject
 | argumentPluralObject
 | assertPluralObject
 | assignmentPluralObject
 | attributePluralObject
 | beginPluralObject
 | blockPluralObject
 | bodyPluralObject
 | breakPluralObject
 | callPluralObject
 | casePluralObject
 | catchPluralObject
 | characterPluralObject
 | classPluralObject
 | commentPluralObject
 | conditionPluralObject
 | constructorPluralObject
 | contentPluralObject
 | continuePluralObject
 | debuggerPluralObject
 | declarationPluralObject
 | decoratorPluralObject
 | defaultPluralObject
 | deferPluralObject
 | dictionaryPluralObject
 | elementPluralObject
 | elsePluralObject
 | ensurePluralObject
 | enumPluralObject
 | exceptPluralObject
 | exportPluralObject
 | forPluralObject
 | filePluralObject
 | finallyPluralObject
 | functionPluralObject
 | generatorPluralObject
 | getterPluralObject
 | hashPluralObject
 | ifPluralObject
 | importPluralObject
 | interfacePluralObject
 | implementationPluralObject
 | keyPluralObject
 | keyValuePairPluralObject
 | lambdaPluralObject
 | letterPluralObject
 | linePluralObject
 | listPluralObject
 | loopPluralObject
 | methodPluralObject
 | mixinPluralObject
 | modulePluralObject
 | namePluralObject
 | namespacePluralObject
 | numberPluralObject
 | objectPluralObject
 | operatorPluralObject
 | panicPluralObject
 | parameterPluralObject
 | passPluralObject
 | propertyPluralObject
 | raisePluralObject
 | rescuePluralObject
 | returnPluralObject
 | requirePluralObject
 | rulesetPluralObject
 | setPluralObject
 | setterPluralObject
 | statementPluralObject
 | stringPluralObject
 | structPluralObject
 | switchPluralObject
 | symbolPluralObject
 | synchronizedPluralObject
 | tagPluralObject
 | termPluralObject
 | throwPluralObject
 | traitPluralObject
 | tuplePluralObject
 | tryPluralObject
 | typePluralObject
 | untilPluralObject
 | usingPluralObject
 | withPluralObject
 | whilePluralObject
 | wordPluralObject
 | valuePluralObject
 | verticalPluralObject
 ;

namedSelectionObject
    : assignmentValNamedObject
 | assignmentVariableNamedObject
 | closeTagNamedObject
 | keywordArgumentNamedObject
 | keywordParameterNamedObject
 | modifierNamedObject
 | openTagNamedObject
 | namedParameterNamedObject
 | parentNamedObject
 | positionalParameterNamedObject
 | argumentNamedObject
 | attributeNamedObject
 | callNamedObject
 | classNamedObject
 | commentNamedObject
 | decoratorNamedObject
 | enumNamedObject
 | functionNamedObject
 | importNamedObject
 | methodNamedObject
 | parameterNamedObject
 | phraseNamedObject
 | propertyNamedObject
 | stringNamedObject
 | tagNamedObject
 | valueNamedObject
 | wordNamedObject
 ;

returnValueNameListSingularObject : RETURN VALUE NAME LIST | RETURN VALUE NAMES ; 
namedParameterListSingularObject : NAMED PARAMETER LIST | NAMED PARAMETERS ; 
positionalParameterListSingularObject : POSITIONAL PARAMETER LIST | POSITIONAL PARAMETERS ; 
returnValueNameSingularObject : RETURN VALUE NAME ; 
topLevelStatementSingularObject : TOP LEVEL STATEMENT ; 
typeArgumentListSingularObject : TYPE ARGUMENT LIST ; 
typeParameterListSingularObject : TYPE PARAMETER LIST ; 
argumentListSingularObject : ARGUMENT LIST | ARGUMENTS ; 
assignmentValSingularObject : ASSIGNMENT VALUE ; 
assignmentVariableSingularObject : ASSIGNMENT VARIABLE | VARIABLE ; 
attributeValSingularObject : ATTRIBUTE VALUE ; 
attributeNameSingularObject : ATTRIBUTE NAME ; 
attributeTextSingularObject : ATTRIBUTE TEXT ; 
closeTagSingularObject : CLOSE TAG | CLOSE ELEMENT ; 
commentTextSingularObject : COMMENT TEXT ; 
doWhileSingularObject : DO WHILE ; 
elseIfSingularObject : ELSE IF | ELIF ; 
foreachSingularObject : FOR EACH ; 
interfaceListSingularObject : INTERFACE LIST | IMPLEMENTS LIST | INTERFACES ; 
keywordArgumentSingularObject : KEYWORD ARGUMENT ; 
keywordParameterSingularObject : KEYWORD PARAMETER ; 
modifierSingularObject : ACCESS MODIFIER | ACCESS SPECIFIER | MODIFIER ; 
modifierListSingularObject : MODIFIER LIST | MODIFIERS ; 
namedParameterSingularObject : NAMED PARAMETER ; 
openTagSingularObject : OPEN TAG | OPEN ELEMENT ; 
parameterListSingularObject : PARAMETER LIST | PARAMETERS ; 
parameterValSingularObject : PARAMETER VALUE ; 
parentListSingularObject : PARENT LIST | EXTENDS LIST | PARENTS ; 
parentSingularObject : BASE CLASS | PARENT | EXTENDS ; 
positionalParameterSingularObject : POSITIONAL PARAMETER ; 
prototypeSingularObject : FUNCTION PROTOTYPE | PROTOTYPE ; 
receiverArgumentSingularObject : RECEIVER ARGUMENT ; 
returnTypeSingularObject : RETURN TYPE ; 
returnValSingularObject : RETURN VALUE ; 
stringTextSingularObject : STRING TEXT | STRING VALUE ; 
typeAliasSingularObject : TYPE ALIAS ; 
typeArgumentSingularObject : TYPE ARGUMENT ; 
typeParameterSingularObject : TYPE PARAMETER ; 
withListSingularObject : WITH LIST ; 
withAliasSingularObject : WITH ALIAS ; 
withItemSingularObject : WITH ITEM ; 
allSingularObject : ALL ; 
argumentSingularObject : ARGUMENT ; 
assertSingularObject : ASSERT | ASSERTION ; 
assignmentSingularObject : ASSIGNMENT ; 
attributeSingularObject : ATTRIBUTE ; 
beginSingularObject : BEGIN ; 
blockSingularObject : BLOCK ; 
bodySingularObject : BODY ; 
breakSingularObject : BREAK ; 
callSingularObject : CALL ; 
caseSingularObject : CASE ; 
catchSingularObject : CATCH ; 
characterSingularObject : CHARACTER ; 
classSingularObject : CLASS ; 
commentSingularObject : COMMENT ; 
conditionSingularObject : CONDITION ; 
constructorSingularObject : CONSTRUCTOR ; 
contentSingularObject : CONTENT ; 
continueSingularObject : CONTINUE ; 
debuggerSingularObject : DEBUGGER ; 
declarationSingularObject : DECLARATION ; 
decoratorSingularObject : DECORATOR | ANNOTATION ; 
defaultSingularObject : DEFAULT ; 
deferSingularObject : DEFER ; 
dictionarySingularObject : DICTIONARY ; 
elementSingularObject : ELEMENT ; 
elseSingularObject : ELSE ; 
ensureSingularObject : ENSURE ; 
enumSingularObject : ENUM ; 
exceptSingularObject : EXCEPT ; 
exportSingularObject : EXPORT ; 
forSingularObject : FOR ; 
fileSingularObject : FILE ; 
finallySingularObject : FINALLY ; 
functionSingularObject : FUNCTION ; 
generatorSingularObject : GENERATOR ; 
getterSingularObject : GETTER ; 
hashSingularObject : HASH ; 
ifSingularObject : IF ; 
importSingularObject : IMPORT | INCLUDE ; 
interfaceSingularObject : INTERFACE | IMPLEMENTS ; 
implementationSingularObject : IMPL | IMPLEMENTATION ; 
keySingularObject : KEY ; 
keyValuePairSingularObject : ENTRY | PAIR ; 
lambdaSingularObject : LAMBDA ; 
letterSingularObject : LETTER ; 
lineSingularObject : LINE ; 
listSingularObject : LIST ; 
loopSingularObject : LOOP ; 
methodSingularObject : METHOD ; 
mixinSingularObject : MIXIN ; 
moduleSingularObject : MODULE ; 
nameSingularObject : NAME ; 
namespaceSingularObject : NAMESPACE ; 
numberSingularObject : NUMBER ; 
objectSingularObject : OBJECT ; 
operatorSingularObject : OPERATOR ; 
panicSingularObject : PANIC ; 
parameterSingularObject : PARAMETER | PARAM ; 
passSingularObject : PASS ; 
propertySingularObject : FIELD | MEMBER | PROPERTY ; 
raiseSingularObject : RAISE ; 
rescueSingularObject : RESCUE ; 
returnSingularObject : RETURN ; 
requireSingularObject : REQUIRE ; 
rulesetSingularObject : RULESET ; 
setSingularObject : SET ; 
setterSingularObject : SETTER ; 
statementSingularObject : STATEMENT ; 
stringSingularObject : STRING ; 
structSingularObject : STRUCT ; 
switchSingularObject : SWITCH ; 
symbolSingularObject : SYMBOL ; 
synchronizedSingularObject : SYNCHRONIZED ; 
tagSingularObject : TAG | ELEMENT ; 
termSingularObject : TERM ; 
throwSingularObject : THROW ; 
traitSingularObject : TRAIT ; 
tupleSingularObject : TUPLE ; 
trySingularObject : TRY ; 
typeSingularObject : TYPE ; 
untilSingularObject : UNTIL ; 
usingSingularObject : USING ; 
withSingularObject : WITH ; 
whileSingularObject : WHILE ; 
wordSingularObject : WORD ; 
valueSingularObject : VALUE ; 
verticalSingularObject : VERTICAL ; 


returnValueNameListPluralObject : RETURN VALUE NAME LISTS | RETURN VALUE NAMESES ; 
namedParameterListPluralObject : NAMED PARAMETER LISTS | NAMED PARAMETERSES ; 
positionalParameterListPluralObject : POSITIONAL PARAMETER LISTS | POSITIONAL PARAMETERSES ; 
returnValueNamePluralObject : RETURN VALUE NAMES ; 
topLevelStatementPluralObject : TOP LEVEL STATEMENTS ; 
typeArgumentListPluralObject : TYPE ARGUMENT LISTS ; 
typeParameterListPluralObject : TYPE PARAMETER LISTS ; 
argumentListPluralObject : ARGUMENT LISTS | ARGUMENTSES ; 
assignmentValPluralObject : ASSIGNMENT VALUES ; 
assignmentVariablePluralObject : ASSIGNMENT VARIABLES | VARIABLES ; 
attributeValPluralObject : ATTRIBUTE VALUES ; 
attributeNamePluralObject : ATTRIBUTE NAMES ; 
attributeTextPluralObject : ATTRIBUTE TEXTS ; 
closeTagPluralObject : CLOSE TAGS | CLOSE ELEMENTS ; 
commentTextPluralObject : COMMENT TEXTS ; 
doWhilePluralObject : DO WHILES ; 
elseIfPluralObject : ELSE IFS | ELIFS ; 
foreachPluralObject : FOR EACHES ; 
interfaceListPluralObject : INTERFACE LISTS | IMPLEMENTS LISTS | INTERFACESES ; 
keywordArgumentPluralObject : KEYWORD ARGUMENTS ; 
keywordParameterPluralObject : KEYWORD PARAMETERS ; 
modifierPluralObject : ACCESS MODIFIERS | ACCESS SPECIFIERS | MODIFIERS ; 
modifierListPluralObject : MODIFIER LISTS | MODIFIERSES ; 
namedParameterPluralObject : NAMED PARAMETERS ; 
openTagPluralObject : OPEN TAGS | OPEN ELEMENTS ; 
parameterListPluralObject : PARAMETER LISTS | PARAMETERSES ; 
parameterValPluralObject : PARAMETER VALUES ; 
parentListPluralObject : PARENT LISTS | EXTENDS LISTS | PARENTSES ; 
parentPluralObject : BASE CLASSES | PARENTS | EXTENDSES ; 
positionalParameterPluralObject : POSITIONAL PARAMETERS ; 
prototypePluralObject : FUNCTION PROTOTYPES | PROTOTYPES ; 
receiverArgumentPluralObject : RECEIVER ARGUMENTS ; 
returnTypePluralObject : RETURN TYPES ; 
returnValPluralObject : RETURN VALUES ; 
stringTextPluralObject : STRING TEXTS | STRING VALUES ; 
typeAliasPluralObject : TYPE ALIASES ; 
typeArgumentPluralObject : TYPE ARGUMENTS ; 
typeParameterPluralObject : TYPE PARAMETERS ; 
withListPluralObject : WITH LISTS ; 
withAliasPluralObject : WITH ALIASES ; 
withItemPluralObject : WITH ITEMS ; 
allPluralObject : ALLS ; 
argumentPluralObject : ARGUMENTS ; 
assertPluralObject : ASSERTS | ASSERTIONS ; 
assignmentPluralObject : ASSIGNMENTS ; 
attributePluralObject : ATTRIBUTES ; 
beginPluralObject : BEGINS ; 
blockPluralObject : BLOCKS ; 
bodyPluralObject : BODIES ; 
breakPluralObject : BREAKS ; 
callPluralObject : CALLS ; 
casePluralObject : CASES ; 
catchPluralObject : CATCHES ; 
characterPluralObject : CHARACTERS ; 
classPluralObject : CLASSES ; 
commentPluralObject : COMMENTS ; 
conditionPluralObject : CONDITIONS ; 
constructorPluralObject : CONSTRUCTORS ; 
contentPluralObject : CONTENTS ; 
continuePluralObject : CONTINUES ; 
debuggerPluralObject : DEBUGGERS ; 
declarationPluralObject : DECLARATIONS ; 
decoratorPluralObject : DECORATORS | ANNOTATIONS ; 
defaultPluralObject : DEFAULTS ; 
deferPluralObject : DEFERS ; 
dictionaryPluralObject : DICTIONARIES ; 
elementPluralObject : ELEMENTS ; 
elsePluralObject : ELSES ; 
ensurePluralObject : ENSURES ; 
enumPluralObject : ENUMS ; 
exceptPluralObject : EXCEPTS ; 
exportPluralObject : EXPORTS ; 
forPluralObject : FORS ; 
filePluralObject : FILES ; 
finallyPluralObject : FINALLIES ; 
functionPluralObject : FUNCTIONS ; 
generatorPluralObject : GENERATORS ; 
getterPluralObject : GETTERS ; 
hashPluralObject : HASHES ; 
ifPluralObject : IFS ; 
importPluralObject : IMPORTS | INCLUDES ; 
interfacePluralObject : INTERFACES | IMPLEMENTSES ; 
implementationPluralObject : IMPLS | IMPLEMENTATIONS ; 
keyPluralObject : KEYS ; 
keyValuePairPluralObject : ENTRIES | PAIRS ; 
lambdaPluralObject : LAMBDAS ; 
letterPluralObject : LETTERS ; 
linePluralObject : LINES ; 
listPluralObject : LISTS ; 
loopPluralObject : LOOPS ; 
methodPluralObject : METHODS ; 
mixinPluralObject : MIXINS ; 
modulePluralObject : MODULES ; 
namePluralObject : NAMES ; 
namespacePluralObject : NAMESPACES ; 
numberPluralObject : NUMBERS ; 
objectPluralObject : OBJECTS ; 
operatorPluralObject : OPERATORS ; 
panicPluralObject : PANICS ; 
parameterPluralObject : PARAMETERS | PARAMS ; 
passPluralObject : PASSES ; 
propertyPluralObject : FIELDS | MEMBERS | PROPERTIES ; 
raisePluralObject : RAISES ; 
rescuePluralObject : RESCUES ; 
returnPluralObject : RETURNS ; 
requirePluralObject : REQUIRES ; 
rulesetPluralObject : RULESETS ; 
setPluralObject : SETS ; 
setterPluralObject : SETTERS ; 
statementPluralObject : STATEMENTS ; 
stringPluralObject : STRINGS ; 
structPluralObject : STRUCTS ; 
switchPluralObject : SWITCHES ; 
symbolPluralObject : SYMBOLS ; 
synchronizedPluralObject : SYNCHRONIZEDS ; 
tagPluralObject : TAGS | ELEMENTS ; 
termPluralObject : TERMS ; 
throwPluralObject : THROWS ; 
traitPluralObject : TRAITS ; 
tuplePluralObject : TUPLES ; 
tryPluralObject : TRIES ; 
typePluralObject : TYPES ; 
untilPluralObject : UNTILS ; 
usingPluralObject : USINGS ; 
withPluralObject : WITHS ; 
whilePluralObject : WHILES ; 
wordPluralObject : WORDS ; 
valuePluralObject : VALUES ; 
verticalPluralObject : VERTICALS ; 


assignmentValNamedObject : ASSIGNMENT VALUE ; 
assignmentVariableNamedObject : ASSIGNMENT VARIABLE | VARIABLE ; 
closeTagNamedObject : CLOSE TAG | CLOSE ELEMENT ; 
keywordArgumentNamedObject : KEYWORD ARGUMENT ; 
keywordParameterNamedObject : KEYWORD PARAMETER ; 
modifierNamedObject : ACCESS MODIFIER | ACCESS SPECIFIER | MODIFIER ; 
openTagNamedObject : OPEN TAG | OPEN ELEMENT ; 
namedParameterNamedObject : NAMED PARAMETER ; 
parentNamedObject : BASE CLASS | PARENT | EXTENDS ; 
positionalParameterNamedObject : POSITIONAL PARAMETER ; 
argumentNamedObject : ARGUMENT ; 
attributeNamedObject : ATTRIBUTE ; 
callNamedObject : CALL ; 
classNamedObject : CLASS ; 
commentNamedObject : COMMENT ; 
decoratorNamedObject : DECORATOR | ANNOTATION ; 
enumNamedObject : ENUM ; 
functionNamedObject : FUNCTION ; 
importNamedObject : IMPORT | INCLUDE ; 
methodNamedObject : METHOD ; 
parameterNamedObject : PARAMETER | PARAM ; 
phraseNamedObject : PHRASE ; 
propertyNamedObject : FIELD | MEMBER | PROPERTY ; 
stringNamedObject : STRING ; 
tagNamedObject : TAG | ELEMENT ; 
valueNamedObject : VALUE ; 
wordNamedObject : WORD ; 



addPrefix : ADD | CREATE | MAKE ;
add : addPrefix formattedText ;

apply : APPLY formattedText TO selectionWithImplicitPhrase ;
arrowKeyDirection : UP | RIGHT | DOWN | LEFT ;
autocomplete : (AUTOCOMPLETE | COMPLETE) selection? ;
back : GO? BACK ;
bareCopy : COPY (the SELECTION)?;
bareCut : CUT (the SELECTION)? ;
bareInspect : SHOW (HOVER | VALUE) | INSPECT SELECTION? ;
cancel : CANCEL | CLEAR ;
change :
    (CHANGE | SET) selectionWithImplicitPhrase TO formattedText |
    REPLACE selectionWithImplicitPhrase WITH formattedText
;

changeWindow : ((CHANGE | SWITCH | GO) TO the)? arrowKeyDirection (WINDOW | PANE) ;
click : (LEFT | MIDDLE | RIGHT)? CLICK formattedText? ;
close : CLOSE (TAB | FILE | WINDOW | PANE | formattedText)? ;
comment : (COMMENT | UNCOMMENT) selection? ;
copy : COPY selectionWithImplicitPhrase ;
cut : CUT selectionWithImplicitPhrase ;
debug :
  debugContinue |
  debugBreakpoint |
  debugPause |
  debugStep |
  debugStartStop
;
dictateStart :
    START? (INSERT | DICTATE | DICTATION) MODE |
    (INSERT | DICTATE) MODE ON |
    START (INSERTING | DICTATING)
;
dictateStop :
    STOP (INSERT | DICTATE | DICTATION) MODE |
    (INSERT | DICTATE | DICTATION) MODE OFF |
    STOP (INSERTING | DICTATING) |
    COMMAND MODE |
    NORMAL MODE
;
edit : (EDIT | REVISE) (ALL | CLIPBOARD | SELECTION | THIS | THAT)?;
inspect : (SHOW (HOVER | the VALUE) (FOR | OF) | INSPECT) selectionWithImplicitPhrase ;
delete : (DELETE | REMOVE) selectionWithImplicitPhrase ;
duplicate : DUPLICATE (selection (ABOVE | BELOW)? | (ABOVE | BELOW) selection) ;
dictate : DICTATE formattedText ;
focus : FOCUS formattedText ;
launch : LAUNCH formattedText ;
forward : GO? (FORWARD | FORWARDS) ;
goToDefinition : GO TO the DEFINITION ;
goTo :
    goToPrefix positionSelection |
    preposition positionSelection |
    GO? navigationPositionSelection
;
goToSyntaxError: goToPrefix the (CLOSEST | NEAREST)? syntaxError ;
goToPrefix : (FIND | SEARCH FOR? | GO TO)? ;
goToRequiredPrefix : FIND | SEARCH FOR? | GO TO ;
goToPhrase :
    positionPhraseRequiredSelection |
    (goToRequiredPrefix | preposition) positionPhraseSelection
;
indent : (
    (INDENT | DEDENT | UNINDENT | DEINDENT | OUTDENT) selection? |
    (REMOVE | DELETE) INDENTATION LEVEL? FROM selection |
    (INCREASE | DECREASE | REDUCE) INDENTATION LEVEL? OF selection
  ) quantifier?
;
insert : (INSERT | APPEND) (ABOVE | BELOW)? formattedText ;
joinLines : JOIN (NEXT? number)? LINES ;
languageMode : ((SET | CHANGE)? THE? LANGUAGE MODE? TO? validLanguage) |
    (validLanguage MODE);
newline :
    (addPrefix | INSERT | DICTATE | TYPE) (ABOVE | BELOW)? (NEW LINE | NEWLINE) |
    ((addPrefix | INSERT | DICTATE | TYPE) A?)? (NEW LINE | NEWLINE) (ABOVE | BELOW)?
;
next : NEXT ;
openFile : OPEN ((A | THE)? FILE called)? formattedText ;
paste : PASTE (ABOVE | BELOW | HERE | INLINE)? ;
pause : PAUSE | (STOP LISTENING) ;
press :
    PRESS modifierKey* key+ |
    PRESS modifierKey+ |
    implicitKey
;
redo : REDO ;
reload : (RELOAD | REFRESH) PAGE? ;
rename : (RENAME | CHANGE the NAME OF) selection TO formattedText ;
repeat : (REPEAT formattedText? | AGAIN) quantifier? ;
showDictationBox : ((OPEN | SHOW) the)? (DICTATE | DICTATION | REVISE | REVISION) BOX ;
changeAll :
    CHANGE (ALL | EVERY) formattedText TO formattedText |
    REPLACE (ALL | EVERY) formattedText WITH formattedText
;
run : RUN formattedText ;
save : SAVE (the FILE)? ;
scroll : SCROLL arrowKeyDirection? ;
scrollPhrase : SCROLL TO formattedText ;
select : SELECT selectionWithImplicitPhrase ;
send : SEND ;
shift : (SHIFT | MOVE) selection (LEFT | RIGHT | UP | DOWN) (quantifier | (BY? (ONE selectionObjectSingular | count selectionObjectPlural)))? ;
show : SHOW? (
    LINKS FOR? formattedText? |
    INPUTS |
    CODE
) ;
sort : SORT (selection | IMPORTS | METHODS | FUNCTIONS);
surroundWith : (ENCLOSE | WRAP | SURROUND) selectionWithImplicitPhrase WITH formattedText ;
style : (FORMAT | STYLE) (the FILE)? ;
setTextStyle : textStyle selectionWithImplicitPhrase | (SET | CHANGE) STYLE OF selectionWithImplicitPhrase TO textStyle;
systemInsert : SYSTEM (INSERT | TYPE | APPEND | DICTATE | ) formattedText ;
switchWindow : SWITCH (WINDOW | PANE | WINDOWS) ;
tabs :
    ((SWITCH | GO | CHANGE) TO)? (
        positional TAB |
        TAB number |
        TAB LEFT |
        the (LEFT | PREVIOUS) TAB |
        TAB RIGHT |
        the (NEXT | RIGHT) TAB
    ) |
    (NEW | CREATE A? NEW? | DUPLICATE the) TAB |
    (NEW | CREATE A? NEW?) FILE
;
tryCommand : TRY formattedText ;
type : TYPE (ABOVE | BELOW)? formattedText ;
undo : UNDO ;
undoCloseTab : (UNDO CLOSE | REOPEN | OPEN CLOSED) TAB ;
use : (CHOOSE | USE)? number ;
window : WINDOW | PANE ;

debugContinue : CONTINUE debugger?;
debugBreakpoint : ADD (AN? INLINE)? BREAKPOINT | (REMOVE | TOGGLE) the INLINE? BREAKPOINT ;
debugPause : PAUSE debugger ; // don't overlap with pause command.
debugStep : STEP (INTO | OUT | OVER) ;
debugStartStop : (START | STOP) debugger ;
debugger : the (DEBUGGING | DEBUGGER | DEBUG) ;

positional : the (
    FIRST |
    SECOND |
    THIRD |
    FOURTH |
    FIFTH |
    SIXTH |
    SEVENTH |
    EIGHTH |
    NINTH |
    TENTH |
    LAST
) (TO LAST)? ;

// Note that for all of these numbers subrules, the rules are in descending order.
// This to make them greedy. This matters a bit less now, but still functions during
// debugging.

// We also minimize nesting here since the ML parsing should not require it, since
// number validity is checked using NumberConverter.
number :
    ZERO |
    numberRange1To10 |
    numberRange1To20 |
    numberRange1To99 |
    numberDigitSequence |
    numberPair |
    numberComposite |
    DIGITS
;

numberRange1To20:
    TWENTY |
    numberWords10To19 |
    numberWords1To9
;

numberRange1To10 :
    TEN |
    numberWords1To9
;

numberWords1To9 :
    NINE |
    EIGHT |
    SEVEN |
    SIX |
    FIVE |
    FOUR |
    THREE |
    TWO |
    ONE
;

numberWordsDigits :
    NINE |
    EIGHT |
    SEVEN |
    SIX |
    FIVE |
    FOUR |
    THREE |
    TWO |
    ONE |
    ZERO |
    O
;

numberWords10To19 :
    NINETEEN |
    EIGHTEEN |
    SEVENTEEN |
    SIXTEEN |
    FIFTEEN |
    FOURTEEN |
    THIRTEEN |
    TWELVE |
    ELEVEN |
    TEN
;

numberRange1To99 :
    numberWords20To99 |
    numberWords10To19 |
    numberWords1To9
;

numberWords20To99 : numberWordsTens numberWords1To9? ;

numberWordsTens :
    NINETY |
    EIGHTY |
    SEVENTY |
    SIXTY |
    FIFTY |
    FORTY |
    THIRTY |
    TWENTY
;

numberWords10To99 :
    numberWords20To99 |
    numberWords10To19
;

numberDigitSequence :
    numberWords1To9 numberWordsDigits+
;

numberPair :
    numberRange1To99 numberRange1To99 |
    numberRange1To99 numberWordsDigits numberWordsDigits
;

// This covers other numbers
numberComposite :
    ((A | numberRange1To99) HUNDRED (AND? numberRange1To99)?) |
    ((A | numberWords1To9) MILLION )?
        (A | numberWords1To9)? THOUSAND
        ((A | numberWords1To9) HUNDRED (AND? numberRange1To99)?)? |
    ((A | numberWords1To9) MILLION )
;

implicitKey :
    FORWARD DELETE |
    DELETE |
    ESCAPE |
    ENTER |
    TAB |
    BACKSPACE |
    PAGEUP |
    PAGEDOWN |
    PAGE UP |
    PAGE DOWN |
    SPACE
;

// it's common for people to say things like "up two" or "right three", so support directions without needing
// to say "times" for a limited number of quantifiers
arrowKeyWithQuantifier :
    GO? arrowKeyDirection (
        quantifier |
        numberRange1To10
    )?
;

modifierKey :
    CONTROL |
    CTRL |
    COMMAND |
    ALT |
    OPTION |
    SHIFT |
    FUNCTION |
    WINDOWS |
    WIN |
    META
;

key :
    implicitKey |
    SEMICOLON |
    COLON |
    QUOTE |
    RIGHT BRACKET |
    LEFT? BRACKET |
    RIGHT BRACE |
    LEFT? BRACE |
    FORWARD SLASH |
    PIPE |
    COMMA |
    PERIOD |
    DOT |
    SLASH |
    QUESTION MARK? |
    ESCAPE |
    DASH |
    MINUS |
    UNDERSCORE |
    EQUAL |
    EQUALS |
    PLUS |
    TICK |
    BACKTICK |
    TILDE |
    RETURN |
    BANG |
    EXCLAMATION (POINT | MARK)? |
    AT |
    HASH |
    POUND |
    DOLLAR SIGN? |
    PERCENT SIGN? |
    CARET |
    AMPERSAND |
    STAR |
    RIGHT (PAREN | PARENTHESIS | PARENTHESES) |
    LEFT? (PAREN | PARENTHESIS | PARENTHESES) |
    UP |
    DOWN |
    LEFT |
    RIGHT |
    HOME |
    END |
    F ONE |
    F TWO |
    F THREE |
    F FOUR |
    F FIVE |
    F SIX |
    F SEVEN |
    F EIGHT |
    F NINE |
    F TEN |
    F ELEVEN |
    F TWELVE |
    ONE |
    TWO |
    THREE |
    FOUR |
    FIVE |
    SIX |
    SEVEN |
    EIGHT |
    NINE |
    ZERO |
    A |
    B |
    C |
    D |
    E |
    F |
    G |
    H |
    I |
    J |
    K |
    L |
    M |
    N |
    O |
    P |
    Q |
    R |
    S |
    T |
    U |
    V |
    W |
    X |
    Y |
    Z
;

textStyle :
    allCaps |
    camelCase |
    capitalize |
    dashes |
    lowercase |
    pascalCase |
    titleCase |
    underscores
;

allCaps: ALL CAPS ;
camelCase: CAMELCASE | CAMEL CASE | CAMEL ;
capitalize: CAPITAL | CAPITALIZE ;
dashes: DASHES ;
lowercase: LOWERCASE | LOWER CASE ;
pascalCase: PASCALCASE | PASCAL CASE | PASCAL ;
titleCase: TITLECASE | TITLE CASE ;
underscores: UNDERSCORES | SNAKE CASE ;

addModifierProd : ASYNC |
    ABSTRACT |
    DEFAULT |
    EXPORT |
    PRIVATE |
    PROTECTED |
    PUBLIC |
    STATIC
;

// Everything after this line is a dummy rule used only by the ML pipeline.

tagName : formattedText ;
closeTagDeclaration : CLOSE tag tagName;
emptyTagDeclaration : EMPTY tag tagName;
openTagDeclaration : OPEN tag tagName;
openAndCloseTagDeclaration : tag tagName;
tagDeclaration :
    closeTagDeclaration |
    emptyTagDeclaration |
    openTagDeclaration |
    openAndCloseTagDeclaration
;
tag : TAG | ELEMENT ;

addOld : addPrefix addObject ;

addModifier :
    ASYNC |
    ABSTRACT |
    DEFAULT |
    EXPORT |
    PRIVATE |
    PROTECTED |
    PUBLIC |
    STATIC
;

addObject :
    ARGUMENT formattedText (EQUALS formattedText)? |
    ASSERT formattedText |
    ATTRIBUTE formattedText |
    (CATCH | EXCEPT) formattedText |
    CLASS formattedText |
    COMMENT formattedText? |
    DECORATOR formattedText |
    (ELIF | ELSE IF) formattedText |
    ELSE formattedText? |
    EMPTY TAG formattedText |
    addModifier* ENUM formattedText |
    (EXTENDS | SUPERCLASS | PARENT) formattedText |
    FINALLY formattedText? |
    formattedText (COLON | IS | EQUALS | EQUAL TO) formattedText |
    FOR LOOP? ((LET | CONST | VAR)? formattedText (IN | OF) formattedText)? |
    addModifier* FUNCTION formattedText |
    IF formattedText? |
    IMPLEMENTS formattedText |
    INTERFACE formattedText |
    FROM formattedText IMPORT formattedText |
    IMPORT DEFAULT? formattedText (AS formattedText)? |
    IMPORT DEFAULT? formattedText (FROM formattedText)? |
    addModifier* METHOD formattedText |
    addModifier* PARAMETER formattedText (EQUALS formattedText)? |
    (PRINT | CONSOLE DOT LOG) OF? formattedText |
    formattedText? (MEMBER | PROPERTY | FIELD) formattedText (EQUALS formattedText)? |
    (RAISE | THROW) formattedText |
    RETURN VALUE formattedText |
    RETURN formattedText |
    RULESET formattedText |
    TAG formattedText |
    TRY formattedText?
    TYPE formattedText
    WHILE LOOP? formattedText |
    WITH formattedText |
    formattedText
;
