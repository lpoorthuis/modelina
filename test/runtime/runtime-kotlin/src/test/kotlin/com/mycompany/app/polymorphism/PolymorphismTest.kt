package com.mycompany.app.polymorphism

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Test

class PolymorphismTest {
    private val objectMapper = jacksonObjectMapper()

    @Test
    fun shouldDeserializeDiscriminatorMappingIntoConcreteType() {
        val pet = objectMapper.readValue<Pet>("""{"kind":"dog","bark":true}""")

        assertInstanceOf(Dog::class.java, pet)
        assertEquals("dog", pet.kind)
        assertEquals(true, (pet as Dog).bark)
    }

    @Test
    fun shouldSerializeConcreteTypeThroughParentInterface() {
        val pet: Pet = Cat(lives = 9, kind = "cat")

        assertEquals(
            """{"kind":"cat","lives":9}""",
            objectMapper.writeValueAsString(pet)
        )
    }
}
