

describe("Blocked Tests", function() {

    afterEach('play at the plate', function() {
        // The umpire says...
        throw new Error("And you're out.");
    });
	
    describe("Batter up", function() {
        it('line drive to center field', function() {
            // I'm taking home
            const its_close = true;
            chai.expect(its_close).to.be.true;
        });
    });

    describe("Side retired", function() {

        it('sneaky bunt', function() {
            // Will have to wait for next inning
            const didnt_see_that_coming = true;
            chai.expect(didnt_see_that_coming).to.be.true;
        });
        it('stealing second', function() {
            const slide = true;
            chai.expect(slide).to.be.true;
        });
        describe("Extra inning", function() {
            it('smashes it out of the park', function() {
                // Game is over
                const the_crowd_goes_wild = true;
                chai.expect(the_crowd_goes_wild).to.be.true;
            });
        });

    });
    
});