build:
	npx projen build

compile:
	npx projen compile

package:
	npx projen package:js

ship:
	@make compile
	@make package