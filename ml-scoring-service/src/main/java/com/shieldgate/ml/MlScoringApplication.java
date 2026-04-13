package com.shieldgate.ml;

import io.dropwizard.core.Application;
import io.dropwizard.core.setup.Bootstrap;
import io.dropwizard.core.setup.Environment;
import com.shieldgate.ml.resources.MlScoringResource;

public class MlScoringApplication extends Application<MlScoringConfiguration> {

    public static void main(final String[] args) throws Exception {
        new MlScoringApplication().run(args);
    }

    @Override
    public String getName() {
        return "ml-scoring-service";
    }

    @Override
    public void initialize(final Bootstrap<MlScoringConfiguration> bootstrap) {
        // Init logic here if necessary
    }

    @Override
    public void run(final MlScoringConfiguration configuration, final Environment environment) {
        environment.jersey().register(new MlScoringResource());
    }
}
